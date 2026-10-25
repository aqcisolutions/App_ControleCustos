import { Bill, WorkSchedule, DailyClosure, BillCategory } from '../types';
import { getTodayStr } from './formatters';

export interface BackupData {
  version: string;
  exportedAt: string;
  bills: Bill[];
  schedule: WorkSchedule;
  closures: Record<string, DailyClosure>;
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  data?: BackupData;
  summary?: {
    billsCount: number;
    closuresCount: number;
    totalAmount: number;
  };
}

const VALID_CATEGORIES: BillCategory[] = ['carro', 'moradia', 'utilidades', 'alimentacao', 'outros'];

export function validateBackupJson(jsonString: string): BackupValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { valid: false, error: 'O arquivo não é um JSON válido.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Estrutura inválida de backup (não é um objeto).' };
  }

  const obj = parsed as Record<string, unknown>;

  // Check version and required fields
  if (!Array.isArray(obj.bills)) {
    return { valid: false, error: 'O arquivo de backup não contém a lista "bills" (contas).' };
  }

  if (!obj.schedule || typeof obj.schedule !== 'object') {
    return { valid: false, error: 'O arquivo de backup não contém a configuração de agenda "schedule".' };
  }

  if (!obj.closures || typeof obj.closures !== 'object' || Array.isArray(obj.closures)) {
    return { valid: false, error: 'O arquivo de backup não contém os fechamentos diários "closures".' };
  }

  // Validate bills
  const bills: Bill[] = [];
  const seenBillIds = new Set<string>();

  for (let i = 0; i < obj.bills.length; i++) {
    const b = obj.bills[i] as Record<string, unknown>;
    if (!b || typeof b !== 'object') {
      return { valid: false, error: `Conta no índice ${i} é inválida.` };
    }

    const id = typeof b.id === 'string' ? b.id.trim() : '';
    const description = typeof b.description === 'string' ? b.description.trim() : (typeof b.name === 'string' ? b.name.trim() : '');
    const amount = Number(b.amount);
    const dueDay = Number(b.dueDay);

    if (!id) {
      return { valid: false, error: `Conta no índice ${i} possui ID vazio.` };
    }
    if (seenBillIds.has(id)) {
      return { valid: false, error: `Conta com ID "${id}" está duplicada no backup.` };
    }
    seenBillIds.add(id);

    if (!description || description.length > 150) {
      return { valid: false, error: `Conta "${id}" possui descrição inválida ou maior que 150 caracteres.` };
    }
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, error: `Conta "${description}" possui valor numérico inválido ou menor/igual a zero.` };
    }
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      return { valid: false, error: `Conta "${description}" possui dia de vencimento inválido (deve ser entre 1 e 31).` };
    }

    let category: BillCategory = 'outros';
    if (typeof b.category === 'string' && VALID_CATEGORIES.includes(b.category as BillCategory)) {
      category = b.category as BillCategory;
    }

    bills.push({
      id,
      description,
      amount,
      dueDay,
      category,
      isRecurring: b.isRecurring !== false,
      initialAccumulated: typeof b.initialAccumulated === 'number' && b.initialAccumulated >= 0 ? b.initialAccumulated : 0,
      startDate: typeof b.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.startDate) ? b.startDate : undefined,
      createdAt: typeof b.createdAt === 'string' ? b.createdAt : new Date().toISOString(),
    });
  }

  // Validate schedule
  const scheduleObj = obj.schedule as Record<string, unknown>;
  const offWeekdays: number[] = [];
  if (Array.isArray(scheduleObj.offWeekdays)) {
    for (const d of scheduleObj.offWeekdays) {
      const num = Number(d);
      if (!isNaN(num) && num >= 0 && num <= 6 && !offWeekdays.includes(num)) {
        offWeekdays.push(num);
      }
    }
  }

  const customDayOverrides: Record<string, boolean> = {};
  if (scheduleObj.customDayOverrides && typeof scheduleObj.customDayOverrides === 'object') {
    for (const [dateKey, val] of Object.entries(scheduleObj.customDayOverrides as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey) && typeof val === 'boolean') {
        customDayOverrides[dateKey] = val;
      }
    }
  }

  const schedule: WorkSchedule = {
    offWeekdays: offWeekdays.length > 0 ? offWeekdays : [0, 3, 6],
    customDayOverrides,
  };

  // Validate closures
  const closures: Record<string, DailyClosure> = {};
  const closuresObj = obj.closures as Record<string, unknown>;

  for (const [dateStr, rawClosure] of Object.entries(closuresObj)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { valid: false, error: `Chave de data de fechamento "${dateStr}" inválida (esperado YYYY-MM-DD).` };
    }
    if (!rawClosure || typeof rawClosure !== 'object') {
      return { valid: false, error: `Fechamento para a data ${dateStr} não é um objeto válido.` };
    }

    const c = rawClosure as Record<string, unknown>;
    const grossEarnings = Number(c.grossEarnings ?? c.grossRevenue ?? 0);
    const fuelExpenses = typeof c.fuelExpenses === 'number' ? c.fuelExpenses : (typeof c.fuelExpenses === 'string' ? Number(c.fuelExpenses) : 0);

    if (isNaN(grossEarnings) || grossEarnings < 0) {
      return { valid: false, error: `Faturamento bruto de ${dateStr} deve ser um número maior ou igual a zero.` };
    }
    if (isNaN(fuelExpenses) || fuelExpenses < 0) {
      return { valid: false, error: `Despesa com combustível de ${dateStr} deve ser um número maior ou igual a zero.` };
    }

    const billsStatus: Record<string, { billId: string; targetAmount: number; saved: boolean; actualAmount: number }> = {};
    if (c.billsStatus && typeof c.billsStatus === 'object') {
      for (const [bKey, sVal] of Object.entries(c.billsStatus as Record<string, unknown>)) {
        if (sVal && typeof sVal === 'object') {
          const st = sVal as Record<string, unknown>;
          billsStatus[bKey] = {
            billId: typeof st.billId === 'string' ? st.billId : bKey,
            targetAmount: Number(st.targetAmount) || 0,
            actualAmount: Number(st.actualAmount) || 0,
            saved: Boolean(st.saved),
          };
        }
      }
    }

    closures[dateStr] = {
      date: dateStr,
      grossEarnings,
      fuelExpenses: fuelExpenses > 0 ? fuelExpenses : undefined,
      notes: typeof c.notes === 'string' ? c.notes : undefined,
      billsStatus,
      completed: c.completed !== false,
      updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : new Date().toISOString(),
    };
  }

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);

  return {
    valid: true,
    data: {
      version: 'motoristapro_v1',
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
      bills,
      schedule,
      closures,
    },
    summary: {
      billsCount: bills.length,
      closuresCount: Object.keys(closures).length,
      totalAmount,
    },
  };
}

export function downloadBackupFile(bills: Bill[], schedule: WorkSchedule, closures: Record<string, DailyClosure>): void {
  const data: BackupData = {
    version: 'motoristapro_v1',
    exportedAt: new Date().toISOString(),
    bills,
    schedule,
    closures,
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `motoristapro-backup-${getTodayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
