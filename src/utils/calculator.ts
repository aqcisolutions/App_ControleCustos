import { Bill, WorkSchedule, DailyClosure, BillReserveCalculation, DayCalculation } from '../types';
import { formatDateToISO, parseDate, getTodayStr } from './formatters';

/**
 * Returns true if a given date string ('YYYY-MM-DD') is a working day
 */
export function isWorkDay(dateStr: string, schedule: WorkSchedule): boolean {
  // Check custom date override first
  if (schedule.customDayOverrides && schedule.customDayOverrides[dateStr] !== undefined) {
    return schedule.customDayOverrides[dateStr];
  }

  // Check general weekly schedule (0 = Sunday, ..., 6 = Saturday)
  const date = parseDate(dateStr);
  const weekday = date.getDay();
  return !schedule.offWeekdays.includes(weekday);
}

/**
 * Computes the first due date strictly on or after launchDate.
 * If dueDay >= launchDay, the first due date is in the same month as launchDate.
 * If dueDay < launchDay, the first due date is in the next month.
 */
export function getFirstDueDate(launchDate: Date, dueDay: number): Date {
  const lYear = launchDate.getFullYear();
  const lMonth = launchDate.getMonth();
  const lDay = launchDate.getDate();

  let dueYear = lYear;
  let dueMonth = lMonth;

  if (dueDay < lDay) {
    dueMonth += 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
  }

  const maxDays = new Date(dueYear, dueMonth + 1, 0).getDate();
  const clampedDay = Math.min(dueDay, maxDays);
  return new Date(dueYear, dueMonth, clampedDay, 12, 0, 0);
}

/**
 * Returns the period [cycleStart, cycleEnd] for a bill around a reference date.
 * Per user requirement:
 * 1. Ao lançar uma conta, o sistema calcula do dia do lançamento até o dia do 1º vencimento,
 *    descontando o valor já reservado/acumulado.
 * 2. Se a conta for ÚNICA (não se repete), ela encerra no dia do vencimento.
 * 3. Se a conta SE REPETE (recorrente):
 *    O sistema calcula do dia subsequente do vencimento até o próximo vencimento,
 *    utilizando o VALOR TOTAL integral da conta dividido pelos próximos dias trabalhados.
 */
export function getBillCycle(bill: Bill, refDate: Date = new Date()): {
  cycleStart: string;
  cycleEnd: string;
  dueDate: Date;
  isBeforePeriod: boolean;
  isAfterPeriod?: boolean;
  isInitialCycle: boolean;
} {
  const isRecurring = bill.isRecurring !== false;
  const launchStr = (bill.startDate && bill.startDate.trim())
    ? bill.startDate.trim()
    : (bill.createdAt ? bill.createdAt.slice(0, 10) : getTodayStr());

  const launchDate = parseDate(launchStr);
  const firstDueDate = getFirstDueDate(launchDate, bill.dueDay);
  const firstDueStr = formatDateToISO(firstDueDate);
  const refDateStr = formatDateToISO(refDate);

  // Case 1: refDate is strictly before the launch date
  if (refDateStr < launchStr) {
    return {
      cycleStart: launchStr,
      cycleEnd: firstDueStr,
      dueDate: firstDueDate,
      isBeforePeriod: true,
      isAfterPeriod: false,
      isInitialCycle: true,
    };
  }

  // Case 2: refDate is within the initial cycle [launchStr, firstDueStr]
  if (refDateStr <= firstDueStr) {
    return {
      cycleStart: launchStr,
      cycleEnd: firstDueStr,
      dueDate: firstDueDate,
      isBeforePeriod: false,
      isAfterPeriod: false,
      isInitialCycle: true,
    };
  }

  // Case 3: refDate is strictly after firstDueDate
  // If non-recurring, bill has concluded
  if (!isRecurring) {
    return {
      cycleStart: launchStr,
      cycleEnd: firstDueStr,
      dueDate: firstDueDate,
      isBeforePeriod: false,
      isAfterPeriod: true,
      isInitialCycle: true,
    };
  }

  // Recurring bill: subsequent cycles
  // "Se foi selecionado que a conta se repete o sistema deve calcular então do dia subsequente
  // do vencimento até o proximo vencimento, porem nesse calcular ele ira pegar o valor total
  // da conta e dividir pelos proximos dias trabalhados."
  const rYear = refDate.getFullYear();
  const rMonth = refDate.getMonth();
  const rDay = refDate.getDate();

  let startYear: number;
  let startMonth: number;
  let endYear: number;
  let endMonth: number;

  if (rDay <= bill.dueDay) {
    // Current cycle ends on this month's due day:
    endYear = rYear;
    endMonth = rMonth;
    // Started on the day after previous month's due day:
    startYear = rMonth === 0 ? rYear - 1 : rYear;
    startMonth = rMonth === 0 ? 11 : rMonth - 1;
  } else {
    // rDay > bill.dueDay: current cycle ends on next month's due day:
    endYear = rMonth === 11 ? rYear + 1 : rYear;
    endMonth = rMonth === 11 ? 0 : rMonth + 1;
    // Started on the day after this month's due day:
    startYear = rYear;
    startMonth = rMonth;
  }

  // Starts on day AFTER previous due date:
  const prevMaxDays = new Date(startYear, startMonth + 1, 0).getDate();
  const actualPrevDay = Math.min(bill.dueDay, prevMaxDays);
  const prevDueDate = new Date(startYear, startMonth, actualPrevDay, 12, 0, 0);
  const cycleStartDate = new Date(prevDueDate);
  cycleStartDate.setDate(cycleStartDate.getDate() + 1);
  const cycleStartStr = formatDateToISO(cycleStartDate);

  // Ends on this cycle's due date:
  const endMaxDays = new Date(endYear, endMonth + 1, 0).getDate();
  const actualEndDay = Math.min(bill.dueDay, endMaxDays);
  const cycleEndDate = new Date(endYear, endMonth, actualEndDay, 12, 0, 0);
  const cycleEndStr = formatDateToISO(cycleEndDate);

  return {
    cycleStart: cycleStartStr,
    cycleEnd: cycleEndStr,
    dueDate: cycleEndDate,
    isBeforePeriod: false,
    isAfterPeriod: false,
    isInitialCycle: false,
  };
}

/**
 * Get all calendar dates ('YYYY-MM-DD') between startDate and endDate inclusive
 */
export function getDateRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const current = parseDate(startDateStr);
  const end = parseDate(endDateStr);

  while (current <= end) {
    dates.push(formatDateToISO(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Calculates dynamic daily targets for a specific bill across its cycle.
 * Divides the bill amount EQUALLY across all working days inside the period.
 * Days of folga receive R$ 0,00.
 */
export function calculateBillDailyMap(
  bill: Bill,
  schedule: WorkSchedule,
  closures: Record<string, DailyClosure>,
  refDate: Date = new Date()
): {
  cycleStart: string;
  cycleEnd: string;
  totalAmount: number;
  alreadyReserved: number;
  remainingAmount: number;
  workDays: string[];
  remainingWorkDays: string[];
  dailyTargets: Record<string, number>; // dateStr -> calculated target
  isFullyReserved: boolean;
  baseDailyQuota: number;
  isBeforePeriod: boolean;
  isAfterPeriod?: boolean;
  isInitialCycle: boolean;
} {
  const { cycleStart, cycleEnd, isBeforePeriod, isAfterPeriod, isInitialCycle } = getBillCycle(bill, refDate);
  const allDays = getDateRange(cycleStart, cycleEnd);
  
  // STRICTLY filter only days where the driver works.
  // Days marked as 'folga' are NEVER included in the distribution!
  const workDays = allDays.filter((d) => isWorkDay(d, schedule));
  const totalWorkDaysInCycle = workDays.length;

  // In the initial cycle, initialAccumulated is deducted from the bill amount:
  // "ao lançar uma conta, o sistema deve calcular o valor a ser reservado do dia do lançamento até o dia do vencimento,
  // analisar se ja tem valor reservado e efetuar o calculo."
  // In subsequent cycles for a recurring bill:
  // "Se foi selecionado que a conta se repete o sistema deve calcular então do dia subsequente do vencimento até o proximo vencimento,
  // porem nesse calcular ele ira pegar o valor total da conta e dividir pelos proximos dias trabalhados."
  const initialAcc = isInitialCycle ? (bill.initialAccumulated || 0) : 0;
  const balanceToDivide = Math.max(0, bill.amount - initialAcc);

  // Equal division per working day:
  const baseDailyQuota = totalWorkDaysInCycle > 0
    ? Math.round((balanceToDivide / totalWorkDaysInCycle) * 100) / 100
    : 0;

  // Track closures already completed in THIS cycle
  let savedFromClosures = 0;
  let hasDeficitFromNao = false;

  for (const dayStr of workDays) {
    const closure = closures[dayStr];
    const billStatus = closure?.billsStatus?.[bill.id];
    if (closure?.completed && billStatus) {
      if (billStatus.saved) {
        savedFromClosures += billStatus.actualAmount !== undefined && billStatus.actualAmount > 0
          ? billStatus.actualAmount
          : (billStatus.targetAmount || baseDailyQuota);
      } else {
        // Driver marked NÃO -> deficit to redistribute
        hasDeficitFromNao = true;
      }
    }
  }

  const alreadyReservedSum = initialAcc + savedFromClosures;
  const remainingAmount = Math.max(0, bill.amount - alreadyReservedSum);

  const todayStr = getTodayStr();
  const remainingWorkDays = workDays.filter(
    (d) => d >= todayStr && (!closures[d]?.completed || d === todayStr)
  );

  // If a past day was marked NÃO, the shortfall is redistributed across remaining work days.
  // Otherwise, each working day receives the exact equal baseDailyQuota!
  const dynamicTarget = (hasDeficitFromNao && remainingWorkDays.length > 0)
    ? Math.round((remainingAmount / remainingWorkDays.length) * 100) / 100
    : baseDailyQuota;

  const dailyTargets: Record<string, number> = {};

  for (const dayStr of workDays) {
    // If day is strictly before cycleStart, target is 0
    if (dayStr < cycleStart) {
      dailyTargets[dayStr] = 0;
      continue;
    }

    const closure = closures[dayStr];
    const billStatus = closure?.billsStatus?.[bill.id];

    if (closure?.completed && billStatus) {
      dailyTargets[dayStr] = billStatus.targetAmount || baseDailyQuota;
    } else if (dayStr >= todayStr) {
      dailyTargets[dayStr] = dynamicTarget;
    } else {
      dailyTargets[dayStr] = baseDailyQuota;
    }
  }

  return {
    cycleStart,
    cycleEnd,
    totalAmount: bill.amount,
    alreadyReserved: alreadyReservedSum,
    remainingAmount,
    workDays,
    remainingWorkDays,
    dailyTargets,
    isFullyReserved: alreadyReservedSum >= bill.amount,
    baseDailyQuota,
    isBeforePeriod,
    isAfterPeriod,
    isInitialCycle,
  };
}

/**
 * Calculates complete progress data for all bills
 */
export function calculateAllBillsProgress(
  bills: Bill[],
  schedule: WorkSchedule,
  closures: Record<string, DailyClosure>,
  refDate: Date = new Date()
): BillReserveCalculation[] {
  const todayStr = getTodayStr();
  const today = parseDate(todayStr);

  return bills.map((bill) => {
    // Determine the relevant cycle for today (or initial start if before period)
    const cycleInfo = getBillCycle(bill, today);
    let evalDate = today;
    if (cycleInfo.isBeforePeriod) {
      evalDate = parseDate(cycleInfo.cycleStart);
    } else if (cycleInfo.isAfterPeriod) {
      evalDate = parseDate(cycleInfo.cycleEnd);
    }

    const calc = calculateBillDailyMap(bill, schedule, closures, evalDate);
    const dueDate = parseDate(calc.cycleEnd);
    const diffTime = dueDate.getTime() - today.getTime();
    const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const startDiff = parseDate(calc.cycleStart).getTime() - today.getTime();
    const daysUntilPeriodStart = Math.max(0, Math.ceil(startDiff / (1000 * 60 * 60 * 24)));

    // For today: if today is before the period starts or after non-recurring bill period, target is 0
    const currentDailyTarget = (cycleInfo.isBeforePeriod || cycleInfo.isAfterPeriod)
      ? 0
      : (calc.dailyTargets[todayStr] ?? calc.baseDailyQuota);

    return {
      bill,
      cycleStart: calc.cycleStart,
      cycleEnd: calc.cycleEnd,
      totalAmount: bill.amount,
      alreadyReserved: calc.alreadyReserved,
      remainingAmount: calc.remainingAmount,
      totalWorkDaysInCycle: calc.workDays.length,
      remainingWorkDays: calc.remainingWorkDays.length,
      currentDailyTarget,
      periodDailyQuota: calc.baseDailyQuota,
      isFullyReserved: calc.isFullyReserved,
      daysUntilDue,
      isBeforePeriod: cycleInfo.isBeforePeriod,
      isAfterPeriod: !!cycleInfo.isAfterPeriod,
      daysUntilPeriodStart,
      isInitialCycle: calc.isInitialCycle,
    };
  });
}

/**
 * Calculates the schedule and target values for a single specific calendar day
 */
export function calculateDaySchedule(
  dateStr: string,
  bills: Bill[],
  schedule: WorkSchedule,
  closures: Record<string, DailyClosure>
): DayCalculation {
  const targetDate = parseDate(dateStr);
  const dayOfMonth = targetDate.getDate();
  const workDay = isWorkDay(dateStr, schedule);
  const closure = closures[dateStr];

  const isDueDayForBills: Bill[] = [];
  const billTargets: DayCalculation['billTargets'] = [];
  const upcomingBills: NonNullable<DayCalculation['upcomingBills']> = [];
  let totalDayTarget = 0;

  for (const bill of bills) {
    const isRecurring = bill.isRecurring !== false;
    // Calculate cycle for this bill at targetDate
    const billCalc = calculateBillDailyMap(bill, schedule, closures, targetDate);

    // If bill is non-recurring and dateStr is after its single cycleEnd:
    // It's finished/concluded, does not repeat in future periods.
    if (!isRecurring && dateStr > billCalc.cycleEnd) {
      continue;
    }

    // If dateStr is strictly before the bill's cycleStart:
    if (dateStr < billCalc.cycleStart) {
      const diffTime = parseDate(billCalc.cycleStart).getTime() - targetDate.getTime();
      const daysUntilStart = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      upcomingBills.push({
        bill,
        cycleStart: billCalc.cycleStart,
        cycleEnd: billCalc.cycleEnd,
        daysUntilStart,
        dailyQuota: billCalc.baseDailyQuota,
      });
      continue;
    }

    // Check if due day today in this cycle
    const isDueToday = (bill.dueDay === dayOfMonth || dateStr === billCalc.cycleEnd) && dateStr >= billCalc.cycleStart && dateStr <= billCalc.cycleEnd;
    if (isDueToday) {
      isDueDayForBills.push(bill);
    }

    // Only add daily target if this is a work day and within period
    if (workDay && dateStr <= billCalc.cycleEnd) {
      const targetAmount = billCalc.dailyTargets[dateStr] || 0;
      const closureStatus = closure?.billsStatus?.[bill.id];

      billTargets.push({
        billId: bill.id,
        billDescription: bill.description,
        targetAmount,
        dueDay: bill.dueDay,
        cycleStart: billCalc.cycleStart,
        cycleEnd: billCalc.cycleEnd,
        savedStatus: closureStatus ? closureStatus.saved : undefined,
        isInitialCycle: billCalc.isInitialCycle,
      });

      totalDayTarget += targetAmount;
    }
  }

  return {
    date: dateStr,
    isWorkDay: workDay,
    isDueDayForBills,
    billTargets,
    upcomingBills,
    totalDayTarget: Math.round(totalDayTarget * 100) / 100,
    hasClosure: !!closure && closure.completed,
    closure,
  };
}
