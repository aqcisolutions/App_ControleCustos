import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, DollarSign, Calendar, Fuel, Save, ArrowRight, AlertTriangle, Sparkles, Check, History, Trash2, RotateCcw } from 'lucide-react';
import { Bill, WorkSchedule, DailyClosure, BillDailyStatus } from '../types';
import { formatCurrency, formatDateLongBR, getTodayStr, parseDate, formatDateToISO, formatDateBR } from '../utils/formatters';
import { calculateDaySchedule, isWorkDay } from '../utils/calculator';
import { ConfirmModal } from './ConfirmModal';

interface DailyClosureViewProps {
  bills: Bill[];
  schedule: WorkSchedule;
  closures: Record<string, DailyClosure>;
  onSaveClosure: (closure: DailyClosure) => void;
  onDeleteClosure: (dateStr: string) => void;
  initialDate?: string;
  onOpenVault: () => void;
}

export const DailyClosureView: React.FC<DailyClosureViewProps> = ({
  bills,
  schedule,
  closures,
  onSaveClosure,
  onDeleteClosure,
  initialDate,
  onOpenVault,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayStr());
  const [grossEarningsInput, setGrossEarningsInput] = useState<string>('');
  const [fuelExpenseInput, setFuelExpenseInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  
  // Status of each bill for the day: billId -> { saved: boolean, customAmount?: number }
  const [billDecisions, setBillDecisions] = useState<Record<string, { saved: boolean; customAmount?: number }>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

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

  // Load existing closure data for selectedDate if present, or initialize defaults
  const daySchedule = calculateDaySchedule(selectedDate, bills, schedule, closures);
  const existingClosure = closures[selectedDate];

  useEffect(() => {
    if (existingClosure) {
      setGrossEarningsInput(existingClosure.grossEarnings.toString());
      setFuelExpenseInput(existingClosure.fuelExpenses ? existingClosure.fuelExpenses.toString() : '');
      setNotesInput(existingClosure.notes || '');

      const loadedDecisions: Record<string, { saved: boolean; customAmount?: number }> = {};
      Object.entries(existingClosure.billsStatus).forEach(([bId, status]) => {
        loadedDecisions[bId] = {
          saved: status.saved,
          customAmount: status.actualAmount,
        };
      });
      setBillDecisions(loadedDecisions);
    } else {
      // Default initial state: if gross earnings not entered yet, empty
      setGrossEarningsInput('');
      setFuelExpenseInput('');
      setNotesInput('');

      // By default, initialize decisions to saved: true with target amounts
      const defaultDecisions: Record<string, { saved: boolean; customAmount?: number }> = {};
      daySchedule.billTargets.forEach((bt) => {
        defaultDecisions[bt.billId] = {
          saved: true,
          customAmount: bt.targetAmount,
        };
      });
      setBillDecisions(defaultDecisions);
    }
    setSaveSuccessMsg(null);
  }, [selectedDate, existingClosure]);

  const grossEarningsNum = parseFloat(grossEarningsInput.replace(',', '.')) || 0;
  const fuelExpenseNum = parseFloat(fuelExpenseInput.replace(',', '.')) || 0;

  // Calculate total reserved based on current decisions
  const totalReservedToday = daySchedule.billTargets.reduce((sum, bt) => {
    const dec = billDecisions[bt.billId];
    if (dec && dec.saved) {
      return sum + (dec.customAmount !== undefined ? dec.customAmount : bt.targetAmount);
    }
    return sum;
  }, 0);

  // Calculate total reserved across all accounts prior to this closure date
  const totalPriorReserved = bills.reduce((sum, b) => {
    let billPrior = b.initialAccumulated || 0;
    Object.entries(closures).forEach(([d, cl]) => {
      if (d !== selectedDate && cl.completed && cl.billsStatus?.[b.id]?.saved) {
        const st = cl.billsStatus[b.id];
        billPrior += (st.actualAmount !== undefined && st.actualAmount > 0 ? st.actualAmount : st.targetAmount);
      }
    });
    return sum + billPrior;
  }, 0);

  // Net remaining after fuel and reserves
  const netEarnings = grossEarningsNum - fuelExpenseNum - totalReservedToday;

  const handleToggleDecision = (billId: string, saved: boolean, defaultAmount: number) => {
    setBillDecisions((prev) => ({
      ...prev,
      [billId]: {
        saved,
        customAmount: saved ? (prev[billId]?.customAmount || defaultAmount) : 0,
      },
    }));
  };

  const handleSetAllDecisions = (saved: boolean) => {
    const updated: Record<string, { saved: boolean; customAmount?: number }> = {};
    daySchedule.billTargets.forEach((bt) => {
      updated[bt.billId] = {
        saved,
        customAmount: saved ? bt.targetAmount : 0,
      };
    });
    setBillDecisions(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const billsStatus: Record<string, BillDailyStatus> = {};
    daySchedule.billTargets.forEach((bt) => {
      const dec = billDecisions[bt.billId];
      const isSaved = dec ? dec.saved : false;
      const actualAmt = isSaved ? (dec?.customAmount ?? bt.targetAmount) : 0;

      billsStatus[bt.billId] = {
        billId: bt.billId,
        targetAmount: bt.targetAmount,
        saved: isSaved,
        actualAmount: actualAmt,
      };
    });

    const newClosure: DailyClosure = {
      date: selectedDate,
      grossEarnings: grossEarningsNum,
      fuelExpenses: fuelExpenseNum > 0 ? fuelExpenseNum : undefined,
      notes: notesInput.trim() || undefined,
      billsStatus,
      completed: true,
      updatedAt: new Date().toISOString(),
    };

    onSaveClosure(newClosure);
    setSaveSuccessMsg('Fechamento salvo com sucesso! Os valores foram recalculados.');
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4500);
  };

  const requestDeleteClosureForDate = (dateStr: string) => {
    setConfirmDialog({
      isOpen: true,
      title: `Excluir Fechamento de ${formatDateBR(dateStr)}`,
      message: `Tem certeza que deseja apagar o registro de faturamento e respostas deste dia? O saldo das contas será recalculado.`,
      action: () => {
        onDeleteClosure(dateStr);
        setSaveSuccessMsg('Fechamento excluído com sucesso.');
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      },
    });
  };

  const todayStr = getTodayStr();

  // Quick date jump helpers
  const setDateOffset = (offsetDays: number) => {
    const base = parseDate(todayStr);
    base.setDate(base.getDate() + offsetDays);
    setSelectedDate(formatDateToISO(base));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Date Selector Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-emerald-400">
              Rotina Noturna / Fim de Expediente
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-1">
              Fechamento do Dia
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 capitalize mt-0.5">
              {formatDateLongBR(selectedDate)}
            </p>
          </div>

          {/* Quick Date Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedDate === todayStr
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setDateOffset(-1)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
            >
              Ontem
            </button>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Work Day Warning if Day Off */}
        {!daySchedule.isWorkDay && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs sm:text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <strong>Atenção:</strong> Este dia está registrado como <strong>Dia de Folga</strong> na sua escala. Se você trabalhou hoje e quer registrar as contas, você pode marcar se reservou normalmente ou ativar o dia no calendário.
            </div>
          </div>
        )}

        {/* Success toast notification */}
        {saveSuccessMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Main Closure Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Step 1: Informar Faturamento do Dia */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm">
              1
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Faturamento do Dia</h3>
              <p className="text-xs text-slate-400">Quanto você fez hoje nos aplicativos (Uber, 99, corridas particulares)?</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Total Bruto Faturado (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={grossEarningsInput}
                  onChange={(e) => setGrossEarningsInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-lg font-bold text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Exemplo: 380.00
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Combustível / GNV do Dia (Opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={fuelExpenseInput}
                  onChange={(e) => setFuelExpenseInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Desconto para você ver seu lucro limpo real
              </span>
            </div>
          </div>

          {/* Real-time cash balance summary */}
          {grossEarningsNum > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-850 border border-slate-700/60 mt-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Faturamento Bruto</span>
                <div className="text-base font-bold text-slate-200">{formatCurrency(grossEarningsNum)}</div>
              </div>

              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">Reserva das Contas</span>
                <div className="text-base font-bold text-emerald-400">-{formatCurrency(totalReservedToday)}</div>
              </div>

              <div>
                <span className="text-[10px] text-teal-400 uppercase tracking-wider block">Saldo Livre do Motorista</span>
                <div className={`text-base font-black ${netEarnings >= 0 ? 'text-teal-300' : 'text-rose-400'}`}>
                  {formatCurrency(netEarnings)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Checklist das Contas do Dia */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Reserva das Contas do Dia
                </h3>
                <p className="text-xs text-slate-400">
                  Responda se conseguiu guardar a quota de cada conta hoje
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetAllDecisions(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer"
              >
                ✅ Marcar SIM para Todas
              </button>
              <button
                type="button"
                onClick={() => handleSetAllDecisions(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                ❌ Marcar NÃO para Todas
              </button>
            </div>
          </div>

          {/* Real-time Accumulated Vault Reserve Summary for this closure */}
          {daySchedule.billTargets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-850 border border-slate-750 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Saldo Reservado Anterior (Cofre)
                </span>
                <span className="text-sm font-bold text-slate-200">
                  {formatCurrency(totalPriorReserved)}
                </span>
                <span className="text-[10px] text-slate-500 block">Antes deste fechamento</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-semibold">
                  Nova Reserva de Hoje (SIM)
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  +{formatCurrency(totalReservedToday)}
                </span>
                <span className="text-[10px] text-emerald-500/80 block">Adicionado ao cofre</span>
              </div>
              <div>
                <span className="text-[10px] text-teal-300 uppercase tracking-wider block font-semibold">
                  Novo Saldo Acumulado no Cofre
                </span>
                <span className="text-sm font-black text-teal-300">
                  {formatCurrency(totalPriorReserved + totalReservedToday)}
                </span>
                <span className="text-[10px] text-teal-500/80 block">Saldo consolidado</span>
              </div>
            </div>
          )}

          {daySchedule.billTargets.length === 0 ? (
            <div className="p-6 text-center bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-3">
              <div className="text-sm font-semibold text-slate-200">
                Nenhuma conta com reserva ativa nesta data ({formatDateBR(selectedDate)})
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Conforme configurado, cada conta tem sua meta calculada e reservada a partir do dia de vencimento até o próximo vencimento. Você pode salvar seu faturamento do dia no Passo 1 normalmente.
              </p>

              {daySchedule.upcomingBills && daySchedule.upcomingBills.length > 0 && (
                <div className="pt-3 text-left space-y-2 border-t border-slate-700/60 max-w-lg mx-auto">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Próximas contas a iniciar reserva:
                  </div>
                  {daySchedule.upcomingBills.map((up) => (
                    <div
                      key={up.bill.id}
                      className="p-3 rounded-lg bg-slate-850 border border-slate-755 flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-slate-100">{up.bill.description}</strong>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Período: {formatDateBR(up.cycleStart)} até {formatDateBR(up.cycleEnd)} · Vence dia {up.bill.dueDay}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                          Em {up.daysUntilStart} {up.daysUntilStart === 1 ? 'dia' : 'dias'}
                        </span>
                        <div className="text-xs font-bold text-emerald-400 mt-1">
                          {formatCurrency(up.dailyQuota)}/dia
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {daySchedule.billTargets.map((bt) => {
                const decision = billDecisions[bt.billId] || { saved: true, customAmount: bt.targetAmount };
                const fullBill = bills.find((b) => b.id === bt.billId);

                // Calculate exact prior reserved amount before this day's closure
                const initialAcc = fullBill?.initialAccumulated || 0;
                let otherClosuresReserved = 0;
                Object.entries(closures).forEach(([d, cl]) => {
                  if (d !== selectedDate && cl.completed && cl.billsStatus?.[bt.billId]?.saved) {
                    const st = cl.billsStatus[bt.billId];
                    otherClosuresReserved += (st.actualAmount !== undefined && st.actualAmount > 0 ? st.actualAmount : st.targetAmount);
                  }
                });
                const priorReserved = Math.round((initialAcc + otherClosuresReserved) * 100) / 100;
                const todayAmount = decision.saved ? (decision.customAmount !== undefined ? decision.customAmount : bt.targetAmount) : 0;
                const newAccumulatedReserved = Math.round((priorReserved + todayAmount) * 100) / 100;

                return (
                  <div
                    key={bt.billId}
                    className={`p-4 rounded-xl border transition-all ${
                      decision.saved
                        ? 'bg-slate-800/80 border-emerald-500/40 shadow-sm'
                        : 'bg-rose-950/20 border-rose-800/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-slate-100">{bt.billDescription}</h4>
                          {fullBill?.isRecurring === false ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Conta Única
                            </span>
                          ) : bt.isInitialCycle ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              1º Ciclo (Lançamento)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              Recorrente (Integral)
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-400">
                            (Vence dia {bt.dueDay})
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>Valor total: <strong className="text-slate-300">{formatCurrency(fullBill?.amount || 0)}</strong></span>
                          <span>·</span>
                          <span>Saldo já reservado antes: <strong className="text-emerald-400">{formatCurrency(priorReserved)}</strong></span>
                        </div>
                      </div>

                      {/* Quota & Decision Buttons */}
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-1">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            Meta de Hoje
                          </div>
                          <div className="text-lg font-black text-emerald-400">
                            {formatCurrency(bt.targetAmount)}
                          </div>
                        </div>

                        {/* Tactile SIM / NÃO buttons */}
                        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-700/70">
                          <button
                            type="button"
                            onClick={() => handleToggleDecision(bt.billId, true, bt.targetAmount)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              decision.saved
                                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>SIM</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleDecision(bt.billId, false, bt.targetAmount)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              !decision.saved
                                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>NÃO</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Explanatory dynamic message with real-time accumulated balance */}
                    <div className="mt-3 pt-2.5 border-t border-slate-700/40 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {decision.saved ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-emerald-300">
                              <strong>Opção SIM:</strong> {formatCurrency(bt.targetAmount)} adicionados à reserva desta conta!
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span className="text-rose-300">
                              <strong>Opção NÃO:</strong> Nenhum valor acrescentado. O valor será redistribuído nos próximos dias úteis.
                            </span>
                          </>
                        )}
                      </div>

                      <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700/70 text-right shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          {decision.saved ? 'Novo Saldo Reservado' : 'Saldo Reservado Mantido'}
                        </span>
                        <span className="text-sm font-black text-emerald-400">
                          {formatCurrency(newAccumulatedReserved)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({formatCurrency(priorReserved)} + {formatCurrency(todayAmount)})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Observações / Notas do dia */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Anotações do Dia (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Chuva forte à tarde, corridas dinâmicas, abasteci no posto X..."
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Action Buttons: Save & Delete this day's closure */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onOpenVault}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 underline-offset-4 hover:underline"
          >
            <span>Ver quanto já foi reservado e quanto falta para cada conta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {existingClosure && (
              <button
                type="button"
                onClick={() => requestDeleteClosureForDate(selectedDate)}
                className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 font-bold text-xs transition-all"
                title="Excluir o lançamento deste dia"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Lançamento</span>
              </button>
            )}

            <button
              type="submit"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Fechamento do Dia</span>
            </button>
          </div>
        </div>
      </form>

      {/* Recent Closures History with individual delete buttons */}
      {Object.keys(closures).length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between text-slate-300 font-bold text-sm">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <span>Histórico de Fechamentos Registrados</span>
            </div>
            <span className="text-xs text-slate-400">
              {Object.keys(closures).length} {Object.keys(closures).length === 1 ? 'dia registrado' : 'dias registrados'}
            </span>
          </div>

          <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto pr-1">
            {Object.values(closures)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((c) => {
                const totalSavedInClosure = Object.values(c.billsStatus)
                  .filter((s) => s.saved)
                  .reduce((sum, s) => sum + s.actualAmount, 0);

                return (
                  <div key={c.date} className="py-2.5 flex items-center justify-between text-xs gap-2">
                    <div>
                      <span className="font-bold text-slate-200">{formatDateBR(c.date)}</span>
                      <span className="text-slate-400 ml-2">
                        Faturamento: <strong className="text-white">{formatCurrency(c.grossEarnings)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-semibold hidden sm:inline">
                        Reservado: {formatCurrency(totalSavedInClosure)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedDate(c.date)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px]"
                      >
                        Ver / Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteClosureForDate(c.date)}
                        className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-950/50 transition-colors"
                        title="Excluir este fechamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
