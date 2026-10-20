import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Bell, CheckCircle2, DollarSign, Clock, ShieldAlert } from 'lucide-react';
import { Bill, WorkSchedule, DailyClosure } from '../types';
import { formatCurrency, MONTH_NAMES_BR, WEEKDAYS_BR, getTodayStr, formatDateToISO } from '../utils/formatters';
import { calculateDaySchedule, isWorkDay } from '../utils/calculator';
import { DayDetailsModal } from './DayDetailsModal';

interface CalendarViewProps {
  bills: Bill[];
  schedule: WorkSchedule;
  closures: Record<string, DailyClosure>;
  onToggleDayOverride: (dateStr: string, currentIsWorkDay: boolean) => void;
  onOpenClosureForDay: (dateStr: string) => void;
  onDeleteClosure?: (dateStr: string) => void;
  onDeleteBill?: (billId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  bills,
  schedule,
  closures,
  onToggleDayOverride,
  onOpenClosureForDay,
  onDeleteClosure,
  onDeleteBill,
}) => {
  const todayStr = getTodayStr();
  const today = new Date();
  
  // Current view year & month (0-indexed)
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [selectedDateModal, setSelectedDateModal] = useState<string | null>(null);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Generate calendar grid dates
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday

  // Month metrics calculation
  let monthWorkDaysCount = 0;
  let monthRestDaysCount = 0;
  let monthTotalReservationsNeeded = 0;

  const monthDaysData = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentYear, currentMonth, day, 12, 0, 0);
    const dateStr = formatDateToISO(dateObj);
    const dayData = calculateDaySchedule(dateStr, bills, schedule, closures);
    
    if (dayData.isWorkDay) {
      monthWorkDaysCount++;
      monthTotalReservationsNeeded += dayData.totalDayTarget;
    } else {
      monthRestDaysCount++;
    }

    monthDaysData.push({ day, dateStr, dayData });
  }

  const averageDailyNeed = monthWorkDaysCount > 0 ? monthTotalReservationsNeeded / monthWorkDaysCount : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Month Navigation & Stats Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-emerald-400">
              Escala & Calendário de Reservas
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 flex items-center gap-3 mt-1">
              <span>{MONTH_NAMES_BR[currentMonth]}</span>
              <span className="text-slate-500 font-medium">{currentYear}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Metas calculadas do lançamento até o 1º vencimento (descontando o acumulado) e, nas contas recorrentes, do dia seguinte ao vencimento até o próximo vencimento com o valor total integral nos dias de trabalho.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoToToday}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              Hoje
            </button>
            <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Month Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Dias de Trabalho
            </span>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {monthWorkDaysCount} <span className="text-xs font-normal text-slate-400">dias</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Dias de Folga
            </span>
            <div className="text-xl font-bold text-slate-300 mt-1">
              {monthRestDaysCount} <span className="text-xs font-normal text-slate-400">dias</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Média Necessária
            </span>
            <div className="text-xl font-bold text-amber-300 mt-1">
              {formatCurrency(averageDailyNeed)}
              <span className="text-xs font-normal text-slate-400"> /dia</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider block">
              Total em Contas
            </span>
            <div className="text-xl font-bold text-white mt-1">
              {formatCurrency(bills.reduce((sum, b) => sum + b.amount, 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-6 shadow-xl overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
          {WEEKDAYS_BR.map((wd) => (
            <div
              key={wd.id}
              className="py-2 text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              <span className="hidden sm:inline">{wd.name}</span>
              <span className="sm:hidden">{wd.short}</span>
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty spacer cells before day 1 */}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="min-h-[85px] sm:min-h-[110px] rounded-xl bg-slate-950/30 border border-slate-800/30 opacity-40 pointer-events-none"
            />
          ))}

          {/* Days of the month */}
          {monthDaysData.map(({ day, dateStr, dayData }) => {
            const isToday = dateStr === todayStr;
            const isWork = dayData.isWorkDay;
            const hasBillsDue = dayData.isDueDayForBills.length > 0;
            const hasClosure = dayData.hasClosure;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDateModal(dateStr)}
                className={`group relative text-left min-h-[90px] sm:min-h-[115px] p-2 sm:p-2.5 rounded-xl border transition-all flex flex-col justify-between overflow-hidden cursor-pointer ${
                  isToday
                    ? 'ring-2 ring-emerald-400 border-emerald-500/80 bg-slate-850 shadow-lg shadow-emerald-500/10'
                    : isWork
                    ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-emerald-500/50 hover:shadow-md'
                    : 'bg-slate-950/60 hover:bg-slate-900 border-slate-850 opacity-60 hover:opacity-90'
                }`}
              >
                {/* Top Row: Day Number & Badges */}
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm sm:text-base font-extrabold ${
                        isToday
                          ? 'text-emerald-400'
                          : isWork
                          ? 'text-slate-100'
                          : 'text-slate-500'
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Hoje
                      </span>
                    )}
                  </div>

                  {/* Closure or Due Badge */}
                  <div className="flex items-center gap-1">
                    {hasBillsDue && (
                      <span 
                        title={`Vencimento de ${dayData.isDueDayForBills.map(b => b.description).join(', ')}`}
                        className="p-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]"
                      >
                        <Bell className="w-3 h-3 text-amber-300" />
                      </span>
                    )}

                    {hasClosure && (
                      <span 
                        title="Fechamento do dia registrado"
                        className="p-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Center / Bottom: Reserve Amount or Rest Label */}
                <div className="mt-1 w-full">
                  {isWork ? (
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium hidden sm:block">
                        Reservar:
                      </div>
                      <div className="text-xs sm:text-sm md:text-base font-bold text-emerald-400 tracking-tight leading-tight">
                        {formatCurrency(dayData.totalDayTarget)}
                      </div>
                      
                      {/* Micro pill showing bill count */}
                      {dayData.billTargets.length > 0 && (
                        <div className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5 hidden sm:block">
                          {dayData.billTargets.length} {dayData.billTargets.length === 1 ? 'conta' : 'contas'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-1">
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <span>😴</span>
                        <span className="hidden sm:inline">Folga</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover hint */}
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-600 inline-block" />
              <span>Dia de Trabalho (com valor diário)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-950 border border-slate-850 opacity-60 inline-block" />
              <span>Dia de Folga (sem reserva)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Vencimento de Conta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fechamento Salvo</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 italic">
            Toque em qualquer dia para ver os detalhes ou alterar entre trabalho/folga.
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDateModal && (
        <DayDetailsModal
          dateStr={selectedDateModal}
          isOpen={!!selectedDateModal}
          onClose={() => setSelectedDateModal(null)}
          bills={bills}
          schedule={schedule}
          closures={closures}
          onToggleDayOverride={onToggleDayOverride}
          onOpenClosureForDay={onOpenClosureForDay}
          onDeleteClosure={onDeleteClosure}
          onDeleteBill={onDeleteBill}
        />
      )}
    </div>
  );
};
