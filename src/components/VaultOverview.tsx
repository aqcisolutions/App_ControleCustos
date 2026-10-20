import React, { useState } from 'react';
import { PiggyBank, CheckCircle2, Clock, ArrowUpRight, Calendar, ShieldCheck, Wallet, Trash2, Edit2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Bill, WorkSchedule, DailyClosure, BillCategory } from '../types';
import { formatCurrency, formatDateBR, getTodayStr } from '../utils/formatters';
import { calculateAllBillsProgress } from '../utils/calculator';
import { ConfirmModal } from './ConfirmModal';

interface VaultOverviewProps {
  bills: Bill[];
  schedule: WorkSchedule;
  closures: Record<string, DailyClosure>;
  onNavigateToClosure: () => void;
  onNavigateToSettings: () => void;
  onDeleteBill: (billId: string) => void;
  onUpdateBill?: (bill: Bill) => void;
  onOpenResetMonthModal?: () => void;
}

export const VaultOverview: React.FC<VaultOverviewProps> = ({
  bills,
  schedule,
  closures,
  onNavigateToClosure,
  onNavigateToSettings,
  onDeleteBill,
  onUpdateBill,
  onOpenResetMonthModal,
}) => {
  const calculations = calculateAllBillsProgress(bills, schedule, closures);

  // Edit modal state if user edits from vault
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDay, setEditDueDay] = useState('');
  const [editInitialAcc, setEditInitialAcc] = useState('');
  const [editIsRecurring, setEditIsRecurring] = useState(true);
  const [editStartDate, setEditStartDate] = useState('');

  // Confirm delete modal state
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

  const handleOpenEdit = (bill: Bill) => {
    setEditingBill(bill);
    setEditDesc(bill.description);
    setEditAmount(bill.amount.toString());
    setEditDueDay(bill.dueDay.toString());
    setEditInitialAcc(bill.initialAccumulated ? bill.initialAccumulated.toString() : '');
    setEditIsRecurring(bill.isRecurring !== false);
    setEditStartDate(bill.startDate || (bill.createdAt ? bill.createdAt.slice(0, 10) : getTodayStr()));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill || !onUpdateBill) return;
    const parsedAmount = parseFloat(editAmount.replace(',', '.'));
    const parsedDue = parseInt(editDueDay, 10);
    const parsedAcc = parseFloat(editInitialAcc.replace(',', '.')) || 0;

    if (!editDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onUpdateBill({
      ...editingBill,
      description: editDesc.trim(),
      amount: parsedAmount,
      dueDay: Math.min(31, Math.max(1, isNaN(parsedDue) ? 1 : parsedDue)),
      isRecurring: editIsRecurring,
      initialAccumulated: parsedAcc > 0 ? parsedAcc : undefined,
      startDate: editStartDate.trim() || getTodayStr(),
    });
    setEditingBill(null);
  };

  const requestDeleteBill = (bill: Bill) => {
    setConfirmDialog({
      isOpen: true,
      title: `Excluir conta: ${bill.description}`,
      message: `Tem certeza que deseja excluir esta conta de ${formatCurrency(bill.amount)}? Todas as metas e reservas serão atualizadas imediatamente.`,
      action: () => {
        onDeleteBill(bill.id);
      },
    });
  };

  // Global totals
  const totalAmountToPay = calculations.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalAlreadyReserved = calculations.reduce((sum, c) => sum + c.alreadyReserved, 0);
  const totalRemaining = Math.max(0, totalAmountToPay - totalAlreadyReserved);
  const globalProgressPercent = totalAmountToPay > 0 
    ? Math.min(100, Math.round((totalAlreadyReserved / totalAmountToPay) * 100)) 
    : 0;

  // Total closures count & SIM counts
  let totalSimResponses = 0;
  let totalNaoResponses = 0;
  Object.values(closures).forEach((cl) => {
    Object.values(cl.billsStatus).forEach((st) => {
      if (st.saved) totalSimResponses++;
      else totalNaoResponses++;
    });
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-emerald-400">
              Cofrinho de Reservas & Metas
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-1">
              Status das Contas
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Valores acumulados a partir do saldo inicial e das respostas "SIM" nos seus fechamentos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {onOpenResetMonthModal && (
              <button
                type="button"
                onClick={onOpenResetMonthModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Zerar / Ajustar Mês</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateToClosure}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <span>Fazer Fechamento de Hoje</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300 flex items-center gap-1.5">
              <PiggyBank className="w-4 h-4 text-emerald-400" />
              Progresso Geral das Reservas do Mês
            </span>
            <span className="text-emerald-400 font-bold">{globalProgressPercent}% Concluído</span>
          </div>

          <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
              style={{ width: `${globalProgressPercent}%` }}
            />
          </div>
        </div>

        {/* 3 Main Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5">
          {/* Total Contas */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Total a Pagar no Mês
              </span>
              <Wallet className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-100 mt-1">
              {formatCurrency(totalAmountToPay)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {bills.length} {bills.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
            </div>
          </div>

          {/* Já Reservado */}
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
                Já Reservado (SIM)
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-300 mt-1">
              {formatCurrency(totalAlreadyReserved)}
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1">
              Dinheiro seguro no cofre para as faturas
            </div>
          </div>

          {/* Quanto Falta */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-rose-300">
                Quanto Falta Reservar
              </span>
              <Clock className="w-4 h-4 text-rose-300" />
            </div>
            <div className="text-2xl font-extrabold text-rose-300 mt-1">
              {formatCurrency(totalRemaining)}
            </div>
            <div className="text-[11px] text-rose-400/80 mt-1">
              Dividido nos dias de trabalho restantes
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown per Bill */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-200">
            Detalhamento por Conta
          </h3>
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline-offset-4 hover:underline"
          >
            + Adicionar Nova Conta
          </button>
        </div>

        {calculations.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-3">
            <p>Nenhuma conta cadastrada no momento.</p>
            <button
              type="button"
              onClick={onNavigateToSettings}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Cadastrar Contas Agora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {calculations.map((calc) => {
              const percent = calc.totalAmount > 0
                ? Math.min(100, Math.round((calc.alreadyReserved / calc.totalAmount) * 100))
                : 0;
              const isFinished = calc.alreadyReserved >= calc.totalAmount;

              return (
                <div
                  key={calc.bill.id}
                  className={`bg-slate-900 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                    isFinished
                      ? 'border-emerald-500/50 bg-gradient-to-b from-slate-900 to-emerald-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top: Description, Due date, Delete & Edit buttons */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-lg font-bold text-slate-100">{calc.bill.description}</h4>
                          {calc.bill.isRecurring === false ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              📄 Conta Única
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              🔁 Mensal
                            </span>
                          )}
                          {calc.isBeforePeriod ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Inicia em {formatDateBR(calc.cycleStart)} (em {calc.daysUntilPeriodStart} dias)
                            </span>
                          ) : calc.isAfterPeriod ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-750">
                              Encerrada
                            </span>
                          ) : calc.isInitialCycle ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              1º Ciclo (Lançamento)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Ciclo Ativo
                            </span>
                          )}
                        </div>

                        {/* Exact calculation period as requested */}
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 w-fit">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Período da conta: <strong>{formatDateBR(calc.cycleStart)}</strong> até <strong>{formatDateBR(calc.cycleEnd)}</strong></span>
                        </div>

                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>Vencimento todo dia <strong className="text-slate-200">{calc.bill.dueDay}</strong></span>
                          <span>·</span>
                          <span className={calc.daysUntilDue <= 3 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                            {calc.daysUntilDue > 0 
                              ? `Vence em ${formatDateBR(calc.cycleEnd)} (faltam ${calc.daysUntilDue} dias)`
                              : calc.daysUntilDue === 0
                              ? 'Vence hoje!'
                              : `Venceu há ${Math.abs(calc.daysUntilDue)} dias`}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons (Edit & Delete directly on Vault card) */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(calc.bill)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Editar valor ou saldo já guardado"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDeleteBill(calc.bill)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
                          title="Excluir esta conta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Status */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-400">Progresso</span>
                        <span className={`font-bold ${isFinished ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {percent}% ({formatCurrency(calc.alreadyReserved)} de {formatCurrency(calc.totalAmount)})
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFinished ? 'bg-emerald-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown Matrix */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800/80">
                      <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-semibold">
                          Já Reservado (SIM)
                        </span>
                        <div className="text-base font-bold text-emerald-300 mt-0.5">
                          {formatCurrency(calc.alreadyReserved)}
                        </div>
                        {calc.isInitialCycle && calc.bill.initialAccumulated && calc.bill.initialAccumulated > 0 ? (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            (Inclui {formatCurrency(calc.bill.initialAccumulated)} já guardado no lançamento)
                          </div>
                        ) : !calc.isInitialCycle && calc.bill.isRecurring !== false ? (
                          <div className="text-[10px] text-teal-400 mt-0.5">
                            (Ciclo recorrente com valor integral)
                          </div>
                        ) : null}
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
                        <span className="text-[10px] text-rose-300 uppercase tracking-wider block font-semibold">
                          Quanto Falta
                        </span>
                        <div className="text-base font-bold text-rose-300 mt-0.5">
                          {formatCurrency(calc.remainingAmount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Daily Quota & Remaining Workdays */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        {calc.isBeforePeriod ? 'Dias de trabalho no período:' : 'Dias trabalhados restantes:'}
                      </span>
                      <strong className="text-slate-200">
                        {calc.isBeforePeriod ? calc.totalWorkDaysInCycle : calc.remainingWorkDays}{' '}
                        {(calc.isBeforePeriod ? calc.totalWorkDaysInCycle : calc.remainingWorkDays) === 1 ? 'dia' : 'dias'}
                      </strong>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[11px]">
                        {calc.isBeforePeriod ? `Quota no período (${formatDateBR(calc.cycleStart)}):` : 'Quota diária hoje:'}
                      </span>
                      <strong className="text-sm font-extrabold text-emerald-400">
                        {isFinished
                          ? 'R$ 0,00'
                          : formatCurrency(calc.isBeforePeriod ? calc.periodDailyQuota : calc.currentDailyTarget)}
                        <span className="text-[10px] font-normal text-slate-400">/dia</span>
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Edit Modal */}
      {editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">
              Editar: {editingBill.description}
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Dia Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editDueDay}
                    onChange={(e) => setEditDueDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Data em que a conta foi informada. O 1º ciclo calcula desta data até o dia de vencimento ({editDueDay || '10'}).
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-1">
                <label className="block text-xs font-bold text-emerald-400">
                  Valor Já Guardado neste Mês (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={editInitialAcc}
                  onChange={(e) => setEditInitialAcc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-850 border border-slate-700 text-sm text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 block leading-relaxed">
                  O valor já acumulado é descontado no 1º ciclo (até o vencimento).
                </span>
              </div>

              {/* Essa conta se repete? */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 space-y-2.5">
                <label className="block text-xs font-bold text-slate-300">
                  Essa conta se repete todos os meses?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditIsRecurring(true)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                      editIsRecurring
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    🔁 Sim (Mensal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsRecurring(false)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                      !editIsRecurring
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    📄 Não (Única)
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {editIsRecurring ? (
                    <span>
                      🔁 <strong>Recorrente:</strong> 1º ciclo divide o valor menos o acumulado até o vencimento ({editDueDay}). Do <strong>dia seguinte ao vencimento</strong> até o próximo mês, divide o <strong>valor total da conta</strong> pelos dias de trabalho!
                    </span>
                  ) : (
                    <span>
                      📄 <strong>Única:</strong> Divide o valor menos o acumulado de {editStartDate} até o dia {editDueDay}. A conta encerra no vencimento.
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBill(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
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
