import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Calendar, DollarSign, RefreshCw, SlidersHorizontal, Info, RotateCcw } from 'lucide-react';
import { Bill, WorkSchedule, BillCategory } from '../types';
import { formatCurrency, WEEKDAYS_BR, formatDateBR, getTodayStr } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface SettingsViewProps {
  bills: Bill[];
  schedule: WorkSchedule;
  onSaveBills: (bills: Bill[]) => void;
  onSaveSchedule: (schedule: WorkSchedule) => void;
  onResetToDefaults: () => void;
  onResetAllBlank: () => void;
  onClearClosures: () => void;
  onOpenResetMonthModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  bills,
  schedule,
  onSaveBills,
  onSaveSchedule,
  onResetToDefaults,
  onResetAllBlank,
  onClearClosures,
  onOpenResetMonthModal,
}) => {
  // Modal state for adding/editing a bill
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  const [descriptionInput, setDescriptionInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dueDayInput, setDueDayInput] = useState('10');
  const [initialAccInput, setInitialAccInput] = useState('');
  const [isRecurringInput, setIsRecurringInput] = useState(true);
  const [startDateInput, setStartDateInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<BillCategory>('carro');

  // Confirm modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  const openAddModal = () => {
    setEditingBillId(null);
    setDescriptionInput('');
    setAmountInput('');
    setDueDayInput('10');
    setInitialAccInput('');
    setIsRecurringInput(true);
    setStartDateInput(getTodayStr());
    setCategoryInput('carro');
    setIsBillModalOpen(true);
  };

  const openEditModal = (bill: Bill) => {
    setEditingBillId(bill.id);
    setDescriptionInput(bill.description);
    setAmountInput(bill.amount.toString());
    setDueDayInput(bill.dueDay.toString());
    setInitialAccInput(bill.initialAccumulated ? bill.initialAccumulated.toString() : '');
    setIsRecurringInput(bill.isRecurring !== false);
    setStartDateInput(bill.startDate || (bill.createdAt ? bill.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)));
    setCategoryInput(bill.category || 'outros');
    setIsBillModalOpen(true);
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountInput.replace(',', '.'));
    const parsedDueDay = parseInt(dueDayInput, 10);
    const parsedInitialAcc = parseFloat(initialAccInput.replace(',', '.')) || 0;

    if (!descriptionInput.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const clampedDueDay = Math.min(31, Math.max(1, isNaN(parsedDueDay) ? 1 : parsedDueDay));
    const effectiveStartDate = startDateInput.trim() || new Date().toISOString().slice(0, 10);

    if (editingBillId) {
      // Edit existing
      const updated = bills.map((b) =>
        b.id === editingBillId
          ? {
              ...b,
              description: descriptionInput.trim(),
              amount: parsedAmount,
              dueDay: clampedDueDay,
              isRecurring: isRecurringInput,
              initialAccumulated: parsedInitialAcc > 0 ? parsedInitialAcc : undefined,
              startDate: effectiveStartDate,
              category: categoryInput,
            }
          : b
      );
      onSaveBills(updated);
    } else {
      // Add new
      const newBill: Bill = {
        id: `bill-${Date.now()}`,
        description: descriptionInput.trim(),
        amount: parsedAmount,
        dueDay: clampedDueDay,
        isRecurring: isRecurringInput,
        initialAccumulated: parsedInitialAcc > 0 ? parsedInitialAcc : undefined,
        startDate: effectiveStartDate,
        category: categoryInput,
        createdAt: new Date().toISOString(),
      };
      onSaveBills([...bills, newBill]);
    }

    setIsBillModalOpen(false);
  };

  const requestDeleteBill = (bill: Bill) => {
    setConfirmDialog({
      isOpen: true,
      title: `Excluir conta: ${bill.description}`,
      message: `Tem certeza que deseja excluir esta conta de ${formatCurrency(bill.amount)}? Os cálculos do calendário e reservas serão recalculados imediatamente.`,
      action: () => {
        onSaveBills(bills.filter((b) => b.id !== bill.id));
      },
    });
  };

  const handleToggleOffWeekday = (weekdayId: number) => {
    const isCurrentlyOff = schedule.offWeekdays.includes(weekdayId);
    let newOffWeekdays: number[];

    if (isCurrentlyOff) {
      newOffWeekdays = schedule.offWeekdays.filter((id) => id !== weekdayId);
    } else {
      newOffWeekdays = [...schedule.offWeekdays, weekdayId];
    }

    onSaveSchedule({
      ...schedule,
      offWeekdays: newOffWeekdays,
    });
  };

  const requestClearCustomOverrides = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Resetar ajustes do calendário',
      message: 'Deseja remover as alterações manuais de dias individuais no calendário e voltar à escala padrão?',
      action: () => {
        onSaveSchedule({
          ...schedule,
          customDayOverrides: {},
        });
      },
    });
  };

  // Quick preset suggestions
  const addPresetBill = (desc: string, val: number, day: number, cat: BillCategory, initialAcc: number = 0) => {
    const newBill: Bill = {
      id: `bill-${Date.now()}-${Math.random()}`,
      description: desc,
      amount: val,
      dueDay: day,
      initialAccumulated: initialAcc > 0 ? initialAcc : undefined,
      category: cat,
      createdAt: new Date().toISOString(),
    };
    onSaveBills([...bills, newBill]);
  };

  const totalWeeklyWorkDays = 7 - schedule.offWeekdays.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-emerald-400">
              Configuração de Despesas & Escala
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-1">
              Gerenciar Contas & Folgas
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Defina suas contas, valores já acumulados para o mês em andamento e seus dias de folga.
            </p>
          </div>

          {onOpenResetMonthModal && (
            <button
              type="button"
              onClick={onOpenResetMonthModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs shadow-md transition-all self-start sm:self-auto"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Zerar / Ajustar Mês</span>
            </button>
          )}
        </div>
      </div>

      {/* Section 1: Dias da Semana de Folga */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Dias da Semana que NÃO Irá Trabalhar (Folgas)</span>
            </h3>
            <p className="text-xs text-slate-400">
              O sistema divide o valor das contas apenas nos dias em que você trabalha.
            </p>
          </div>

          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            {totalWeeklyWorkDays} dias de trabalho / {schedule.offWeekdays.length} folgas por semana
          </div>
        </div>

        {/* 7 Days Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
          {WEEKDAYS_BR.map((wd) => {
            const isOff = schedule.offWeekdays.includes(wd.id);

            return (
              <button
                key={wd.id}
                type="button"
                onClick={() => handleToggleOffWeekday(wd.id)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  isOff
                    ? 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                    : 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300 shadow-sm'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider block">
                  {wd.short}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block">
                  {isOff ? '😴 Folga' : '💼 Trabalha'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Info card */}
        <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-2.5 text-xs text-slate-300">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Dica flexível:</strong> Se você precisar folgar ou trabalhar em um dia específico fora da rotina padrão, basta tocar diretamente no dia no <strong>Calendário</strong> para alternar.
          </span>
        </div>

        {/* Custom overrides summary */}
        {Object.keys(schedule.customDayOverrides).length > 0 && (
          <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
            <span>
              Você tem {Object.keys(schedule.customDayOverrides).length} ajuste(s) individual(is) no calendário.
            </span>
            <button
              type="button"
              onClick={requestClearCustomOverrides}
              className="text-rose-400 hover:text-rose-300 font-medium underline-offset-4 hover:underline"
            >
              Resetar ajustes manuais
            </button>
          </div>
        )}
      </div>

      {/* Section 2: Contas Mensais */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Contas Mensais Cadastradas</span>
            </h3>
            <p className="text-xs text-slate-400">
              Insira quantas contas forem necessárias com o valor total e o que já foi guardado.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Conta</span>
          </button>
        </div>

        {/* Bills List */}
        {bills.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/30 rounded-xl border border-slate-800">
            <p className="text-sm text-slate-300">Nenhuma conta cadastrada no momento.</p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-3 text-xs text-emerald-400 font-bold hover:underline"
            >
              + Clique aqui para cadastrar sua primeira conta
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/70 hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {bill.dueDay}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-100">
                      {bill.description}
                    </h4>
                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                      <span>Vencimento todo dia <strong className="text-slate-300">{bill.dueDay}</strong></span>
                      {bill.isRecurring === false ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                          📄 Conta Única (Início: {bill.startDate ? formatDateBR(bill.startDate) : ''})
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          🔁 Recorrente (Mensal)
                        </span>
                      )}
                      {bill.initialAccumulated && bill.initialAccumulated > 0 && (
                        <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Já acumulado: {formatCurrency(bill.initialAccumulated)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/50">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Valor Total
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-400">
                      {formatCurrency(bill.amount)}
                    </span>
                  </div>

                  {/* Buttons: Edit & Delete */}
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(bill)}
                      className="p-2 rounded-lg text-slate-300 hover:text-white bg-slate-750 hover:bg-slate-700 transition-colors"
                      title="Editar Conta"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteBill(bill)}
                      className="p-2 rounded-lg text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 transition-colors"
                      title="Excluir Conta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick presets for rideshare drivers */}
        <div className="pt-4 border-t border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Sugestões Rápidas de Motorista (Clique para adicionar):
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addPresetBill('Aluguel do Carro', 1680.00, 12, 'carro')}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-emerald-500/40 transition-colors"
            >
              + Aluguel Carro (R$ 1.680 - dia 12)
            </button>
            <button
              type="button"
              onClick={() => addPresetBill('Seguro do Carro', 260.00, 18, 'carro')}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-emerald-500/40 transition-colors"
            >
              + Seguro Auto (R$ 260 - dia 18)
            </button>
            <button
              type="button"
              onClick={() => addPresetBill('Energia Elétrica (Luz)', 350.00, 20, 'utilidades')}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-emerald-500/40 transition-colors"
            >
              + Luz (R$ 350 - dia 20)
            </button>
            <button
              type="button"
              onClick={() => addPresetBill('Conta de Água', 150.00, 25, 'utilidades')}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-emerald-500/40 transition-colors"
            >
              + Água (R$ 150 - dia 25)
            </button>
            <button
              type="button"
              onClick={() => addPresetBill('Plano de Celular 5G', 85.00, 5, 'utilidades')}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-emerald-500/40 transition-colors"
            >
              + Celular 5G (R$ 85 - dia 05)
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Gestão de Dados */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-slate-200">Gerenciamento de Dados & Início de Mês</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setConfirmDialog({
                isOpen: true,
                title: 'Zerar Tudo do Zero',
                message: 'Isso irá apagar todas as contas e todos os fechamentos para você começar totalmente do zero com suas contas reais. Deseja continuar?',
                action: onResetAllBlank,
              });
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 border border-rose-800/50 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Zerar Tudo do Zero</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setConfirmDialog({
                isOpen: true,
                title: 'Zerar Apenas Fechamentos',
                message: 'Isso irá apagar apenas o histórico diário de faturamento e respostas SIM/NÃO. Suas contas cadastradas continuarão salvas. Deseja continuar?',
                action: onClearClosures,
              });
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Zerar Apenas Fechamentos Diários</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setConfirmDialog({
                isOpen: true,
                title: 'Restaurar Dados de Exemplo',
                message: 'Deseja carregar as contas de exemplo padrão (Aluguel R$ 1680 dia 12, Luz R$ 350 dia 20, Água R$ 150 dia 25)?',
                action: onResetToDefaults,
              });
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Restaurar Dados de Exemplo</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Bill Modal */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">
                {editingBillId ? 'Editar Conta' : 'Nova Conta Mensal'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBillModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Descrição da Conta
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Luz, Parcela do Carro, Água..."
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Valor Total (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Ex: 1680.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Dia Vencimento (1 a 31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex: 12"
                    value={dueDayInput}
                    onChange={(e) => setDueDayInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Data do Lançamento da Conta */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Data do Lançamento da Conta
                </label>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Data em que a conta foi informada. O 1º ciclo calculará desta data até o vencimento (dia {dueDayInput || '10'}).
                </span>
              </div>

              {/* Crucial field for mid-month launch: valor já acumulado */}
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Valor Já Guardado / Acumulado neste Mês (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00 (deixe em branco se for zero)"
                  value={initialAccInput}
                  onChange={(e) => setInitialAccInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-850 border border-slate-700 text-sm text-emerald-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 block leading-relaxed">
                  O sistema desconta o valor já guardado e divide apenas a diferença do dia do lançamento ({startDateInput || 'hoje'}) até o vencimento nos dias de trabalho!
                </span>
              </div>

              {/* Essa conta se repete? */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-700/80 space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Essa conta se repete todos os meses?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecurringInput(true)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                      isRecurringInput
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>🔁 Sim (Recorrente todo mês)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRecurringInput(false)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                      !isRecurringInput
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>📄 Não (Conta única / avulsa)</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {isRecurringInput ? (
                    <span>
                      🔁 <strong>Conta Recorrente:</strong> Do lançamento ({startDateInput}) até o 1º vencimento (dia {dueDayInput}), divide o que sobra descontando o que já tem guardado. A partir do <strong>dia subsequente ao vencimento</strong> até o próximo vencimento, pega o <strong>valor total da conta</strong> e divide pelos próximos dias trabalhados!
                    </span>
                  ) : (
                    <span>
                      📄 <strong>Conta Única:</strong> Divide o saldo da conta (descontando o valor acumulado) do dia do lançamento ({startDateInput}) até o vencimento seguinte (dia {dueDayInput}) nos dias trabalhados. A conta encerra no vencimento.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value as BillCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="carro">Veículo / Carro (Aluguel, Financiamento, Seguro)</option>
                  <option value="moradia">Moradia (Aluguel da Casa, Condomínio)</option>
                  <option value="utilidades">Utilidades (Luz, Água, Internet, Celular)</option>
                  <option value="outros">Outros / Impostos (MEI, IPVA, etc.)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBillModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20"
                >
                  {editingBillId ? 'Salvar Alterações' : 'Cadastrar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app custom ConfirmModal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
