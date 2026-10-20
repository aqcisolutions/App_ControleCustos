import React, { useState } from 'react';
import { X, Calendar, DollarSign, AlertCircle, CheckCircle2, XCircle, ArrowRight, ToggleLeft, ToggleRight, Bell, Trash2 } from 'lucide-react';
import { Bill, WorkSchedule, DailyClosure } from '../types';
import { formatCurrency, formatDateLongBR, formatDateBR, parseDate } from '../utils/formatters';
import { calculateDaySchedule } from '../utils/calculator';
import { ConfirmModal } from './ConfirmModal';

interface DayDetailsModalProps {
  dateStr: string;
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  schedule: WorkSchedule;
  closures: Record<string, DailyClosure>;
  onToggleDayOverride: (dateStr: string, currentIsWorkDay: boolean) => void;
  onOpenClosureForDay: (dateStr: string) => void;
  onDeleteClosure?: (dateStr: string) => void;
  onDeleteBill?: (billId: string) => void;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  dateStr,
  isOpen,
  onClose,
  bills,
  schedule,
  closures,
  onToggleDayOverride,
  onOpenClosureForDay,
  onDeleteClosure,
  onDeleteBill,
}) => {
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

  if (!isOpen || !dateStr) return null;

  const daySchedule = calculateDaySchedule(dateStr, bills, schedule, closures);
  const formattedDate = formatDateLongBR(dateStr);
  const closure = closures[dateStr];
  const targetDate = parseDate(dateStr);
  const dayOfMonth = targetDate.getDate();

  const requestDeleteThisClosure = () => {
    if (!onDeleteClosure) return;
    setConfirmDialog({
      isOpen: true,
      title: `Excluir Fechamento de ${formatDateBR(dateStr)}`,
      message: `Tem certeza que deseja apagar o registro deste dia? Os cálculos do mês serão recalculados imediatamente.`,
      action: () => {
        onDeleteClosure(dateStr);
      },
    });
  };

  const requestDeleteBill = (billId: string, desc: string) => {
    if (!onDeleteBill) return;
    setConfirmDialog({
      isOpen: true,
      title: `Excluir Conta: ${desc}`,
      message: `Tem certeza que deseja excluir esta conta? Ela será removida de todos os cálculos.`,
      action: () => {
        onDeleteBill(billId);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                daySchedule.isWorkDay 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {daySchedule.isWorkDay ? '💼 Dia de Trabalho' : '😴 Dia de Folga / Descanso'}
              </span>

              {daySchedule.hasClosure && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Fechamento Salvo
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-slate-100 capitalize">{formattedDate}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Detalhes da reserva diária e contas associadas</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Work / Rest Toggle Card */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  {daySchedule.isWorkDay ? 'Você está escalado para trabalhar' : 'Você está de folga neste dia'}
                </div>
                <div className="text-xs text-slate-400">
                  {daySchedule.isWorkDay 
                    ? 'Quer tirar folga hoje? As contas serão redistribuídas.' 
                    : 'Vai fazer um extra? O valor diário das contas vai diminuir.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleDayOverride(dateStr, daySchedule.isWorkDay)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                daySchedule.isWorkDay
                  ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
              }`}
            >
              {daySchedule.isWorkDay ? (
                <>
                  <ToggleRight className="w-4 h-4" />
                  Mudar para Folga
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" />
                  Trabalhar neste dia
                </>
              )}
            </button>
          </div>

          {/* Due date notice if any bill matures today */}
          {daySchedule.isDueDayForBills.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                <Bell className="w-4 h-4 animate-bounce" />
                <span>Vencimento de Conta Hoje!</span>
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                {daySchedule.isDueDayForBills.map((b) => (
                  <div key={b.id} className="flex justify-between items-center py-0.5">
                    <span className="font-semibold text-white">🔔 {b.description}</span>
                    <span className="font-bold text-amber-300">{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Reserve Breakdown */}
          {daySchedule.isWorkDay ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Reserva Diária Por Conta ({dateStr})
                </h4>
                <span className="text-xs font-bold text-emerald-400">
                  Total do Dia: {formatCurrency(daySchedule.totalDayTarget)}
                </span>
              </div>

              {daySchedule.billTargets.length === 0 ? (
                <div className="p-5 text-center bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-3">
                  <div className="text-sm font-semibold text-slate-200">
                    Nenhuma conta com reserva ativa nesta data ({formatDateBR(dateStr)})
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Conforme a regra do sistema, cada conta é dividida e reservada somente dentro do seu respectivo período de vencimento.
                  </p>

                  {daySchedule.upcomingBills && daySchedule.upcomingBills.length > 0 && (
                    <div className="pt-2 text-left space-y-2 border-t border-slate-700/60">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        Próximas contas a iniciar reserva:
                      </div>
                      {daySchedule.upcomingBills.map((up) => (
                        <div
                          key={up.bill.id}
                          className="p-2.5 rounded-lg bg-slate-850 border border-slate-750 flex items-center justify-between text-xs"
                        >
                          <div>
                            <strong className="text-slate-100">{up.bill.description}</strong>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Período: {formatDateBR(up.cycleStart)} até {formatDateBR(up.cycleEnd)} · Vence dia {up.bill.dueDay}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
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
                <div className="space-y-2">
                  {daySchedule.billTargets.map((item) => {
                    const fullBill = bills.find((b) => b.id === item.billId);
                    const isDueToday = item.dueDay === dayOfMonth;

                    return (
                      <div
                        key={item.billId}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                          isDueToday 
                            ? 'bg-amber-500/10 border-amber-500/30' 
                            : 'bg-slate-800/40 border-slate-700/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-100">
                              {item.billDescription}
                            </span>
                            {fullBill?.isRecurring === false && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Conta Única
                              </span>
                            )}
                            {isDueToday && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Vence Hoje
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Valor total: <span className="text-slate-300">{formatCurrency(fullBill?.amount || 0)}</span> · Vencimento dia {item.dueDay}
                            {item.cycleStart && item.cycleEnd && (
                              <span className="text-slate-400 ml-1">
                                · Período: <strong className="text-slate-300">{formatDateBR(item.cycleStart)} a {formatDateBR(item.cycleEnd)}</strong>
                              </span>
                            )}
                            {item.isInitialCycle && fullBill?.initialAccumulated && fullBill.initialAccumulated > 0 ? (
                              <span className="text-emerald-400 ml-1.5">
                                (Já guardado: {formatCurrency(fullBill.initialAccumulated)})
                              </span>
                            ) : !item.isInitialCycle && fullBill?.isRecurring !== false ? (
                              <span className="text-teal-400 ml-1.5">
                                (Ciclo integral: {formatCurrency(fullBill?.amount || 0)})
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-slate-400 font-medium">Reservar Hoje:</div>
                            <div className="text-base font-bold text-emerald-400">
                              {formatCurrency(item.targetAmount)}
                            </div>
                            {item.savedStatus !== undefined && (
                              <div className="text-[11px] font-semibold mt-0.5">
                                {item.savedStatus ? (
                                  <span className="text-emerald-400 flex items-center justify-end gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Reservado
                                  </span>
                                ) : (
                                  <span className="text-rose-400 flex items-center justify-end gap-1">
                                    <XCircle className="w-3 h-3" /> Não reservado
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {onDeleteBill && (
                            <button
                              type="button"
                              onClick={() => requestDeleteBill(item.billId, item.billDescription)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              title="Excluir esta conta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total Daily Card */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-800/40 flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-400 font-medium uppercase tracking-wider">
                    Total a guardar hoje no cofrinho
                  </div>
                  <div className="text-xs text-slate-400">
                    Soma de todas as quotas diárias das contas
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-300">
                  {formatCurrency(daySchedule.totalDayTarget)}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-slate-800/30 border border-slate-800">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                😴
              </div>
              <h4 className="text-base font-bold text-slate-200">Dia de Descanso Programado</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Você não precisa reservar valores neste dia. Suas contas são divididas exclusivamente pelos dias de trabalho.
              </p>
            </div>
          )}

          {/* Closure status details if completed */}
          {closure && closure.completed && (
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Resumo do Fechamento Salvo
                </span>
                <span className="text-xs text-slate-400">
                  Faturamento: <strong className="text-white">{formatCurrency(closure.grossEarnings)}</strong>
                </span>
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                {Object.entries(closure.billsStatus).map(([bId, status]) => {
                  const bill = bills.find((b) => b.id === bId);
                  return (
                    <div key={bId} className="flex justify-between items-center py-0.5">
                      <span>{bill?.description || 'Conta'}:</span>
                      <span className={status.saved ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {status.saved ? `SIM (R$ ${status.actualAmount.toFixed(2)})` : 'NÃO reservado'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Delete closure button for this date */}
              {onDeleteClosure && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={requestDeleteThisClosure}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-800/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Fechamento deste Dia</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>

          {daySchedule.isWorkDay && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenClosureForDay(dateStr);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all"
            >
              <span>{daySchedule.hasClosure ? 'Editar Fechamento' : 'Fazer Fechamento'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* In-app Confirm Modal */}
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
