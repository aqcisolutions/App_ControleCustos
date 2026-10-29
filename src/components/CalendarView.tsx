import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Calendar as CalendarIcon,
  Bell,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  CheckSquare,
  BedDouble,
  Briefcase,
  SlidersHorizontal,
} from 'lucide-react';
import { Bill, WorkSchedule, DailyClosure } from '../types';
import {
  formatCurrency,
  MONTH_NAMES_BR,
  WEEKDAYS_BR,
  getTodayStr,
  formatDateToISO,
  formatDateBR,
  parseDate,
} from '../utils/formatters';
import { calculateDaySchedule } from '../utils/calculator';
import { DayDetailsModal } from './DayDetailsModal';

interface CalendarViewProps {
  bills: Bill[];
  schedule: WorkSchedule;
  closures: Record<string, DailyClosure>;
  onToggleDayOverride: (dateStr: string, currentIsWorkDay: boolean) => void;
  onOpenClosureForDay: (dateStr: string) => void;
  onDeleteClosure?: (dateStr: string) => void;
  onDeleteBill?: (billId: string) => void;
  onCollapseCalendar?: () => void;
}

export type CalendarViewMode = 'day' | 'week' | 'month';

export const CalendarView: React.FC<CalendarViewProps> = ({
  bills,
  schedule,
  closures,
  onToggleDayOverride,
  onOpenClosureForDay,
  onDeleteClosure,
  onDeleteBill,
  onCollapseCalendar,
}) => {
  const todayStr = getTodayStr();
  const today = parseDate(todayStr);

  // Responsive default: 'week' on mobile viewports (< 768px), 'month' on desktop
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'week';
    }
    return 'month';
  });

  // Current active date (ISO 'YYYY-MM-DD')
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Year and month for month view
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());

  // Modal for day details click
  const [selectedDateModal, setSelectedDateModal] = useState<string | null>(null);

  // Return to Today
  const handleGoToToday = () => {
    setSelectedDate(todayStr);
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // --- Navigation Handlers ---
  const handlePrev = () => {
    if (viewMode === 'month') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
    } else if (viewMode === 'week') {
      const d = parseDate(selectedDate);
      d.setDate(d.getDate() - 7);
      const newIso = formatDateToISO(d);
      setSelectedDate(newIso);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    } else {
      // Day view
      const d = parseDate(selectedDate);
      d.setDate(d.getDate() - 1);
      const newIso = formatDateToISO(d);
      setSelectedDate(newIso);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
    } else if (viewMode === 'week') {
      const d = parseDate(selectedDate);
      d.setDate(d.getDate() + 7);
      const newIso = formatDateToISO(d);
      setSelectedDate(newIso);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    } else {
      // Day view
      const d = parseDate(selectedDate);
      d.setDate(d.getDate() + 1);
      const newIso = formatDateToISO(d);
      setSelectedDate(newIso);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    }
  };

  // --- Month View Data Generation ---
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday

  const monthDaysData = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentYear, currentMonth, day, 12, 0, 0);
    const dateStr = formatDateToISO(dateObj);
    const dayData = calculateDaySchedule(dateStr, bills, schedule, closures);
    monthDaysData.push({ day, dateStr, dayData });
  }

  // --- Week View Data Generation ---
  // Generate 7 days of the week containing selectedDate (Sunday to Saturday)
  const selDateObj = parseDate(selectedDate);
  const weekStart = new Date(selDateObj);
  weekStart.setDate(selDateObj.getDate() - selDateObj.getDay());

  const weekDaysData = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = formatDateToISO(d);
    const dayData = calculateDaySchedule(dateStr, bills, schedule, closures);
    weekDaysData.push({
      dateObj: d,
      dateStr,
      dayData,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  const weekStartDateStr = formatDateBR(formatDateToISO(weekStart));
  const weekEndObj = new Date(weekStart);
  weekEndObj.setDate(weekStart.getDate() + 6);
  const weekEndDateStr = formatDateBR(formatDateToISO(weekEndObj));

  // --- Day View Data ---
  const currentDayData = calculateDaySchedule(selectedDate, bills, schedule, closures);
  const currentDayClosure = closures[selectedDate];
  const currentDayObj = parseDate(selectedDate);
  const currentDayWeekday = WEEKDAYS_BR.find((w) => w.id === currentDayObj.getDay())?.name || '';

  // Title for header based on mode
  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return (
        <span className="flex items-center gap-2">
          <span>{MONTH_NAMES_BR[currentMonth]}</span>
          <span className="text-slate-500 font-medium">{currentYear}</span>
        </span>
      );
    }
    if (viewMode === 'week') {
      return (
        <span className="flex items-center gap-2 text-base sm:text-xl font-bold">
          <span>Semana: {weekStartDateStr} a {weekEndDateStr}</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-2 text-base sm:text-xl font-bold">
        <span>{currentDayWeekday}, {formatDateBR(selectedDate)}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Calendar Navigation & Mode Selector Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Mode switcher + Current Period Title */}
          <div>
            <div className="text-[11px] uppercase font-bold tracking-wider text-emerald-400 mb-1 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Escala & Calendário de Diárias</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
              {getHeaderTitle()}
            </h2>
          </div>

          {/* Right: View Mode Toggle Segmented Control & Navigation */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* View Mode Selector (Dia, Semana, Mês) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dia
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mês
              </button>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleGoToToday}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
                title="Ir para a data de hoje"
              >
                Hoje
              </button>

              <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Anterior"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Próximo"
                  aria-label="Próximo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {onCollapseCalendar && (
                <button
                  type="button"
                  onClick={onCollapseCalendar}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-colors cursor-pointer shadow-sm ml-1"
                  title="Recolher calendário e voltar ao resumo inicial"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Recolher</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- VIEW MODE 1: MÊS (Month Grid) --- */}
      {viewMode === 'month' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-xl overflow-hidden animate-in fade-in">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {WEEKDAYS_BR.map((wd) => (
              <div
                key={wd.id}
                className="py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400"
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
                className="min-h-[75px] sm:min-h-[105px] rounded-xl bg-slate-950/30 border border-slate-800/30 opacity-40 pointer-events-none"
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
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setSelectedDateModal(dateStr);
                  }}
                  className={`group relative text-left min-h-[80px] sm:min-h-[110px] p-2 sm:p-2.5 rounded-xl border transition-all flex flex-col justify-between overflow-hidden cursor-pointer ${
                    isToday
                      ? 'ring-2 ring-emerald-400 border-emerald-500/80 bg-slate-850 shadow-lg shadow-emerald-500/10'
                      : isWork
                      ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-emerald-500/50 hover:shadow-md'
                      : 'bg-slate-950/60 hover:bg-slate-900 border-slate-850 opacity-60 hover:opacity-90'
                  }`}
                >
                  {/* Top Row: Day Number & Badges */}
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-center gap-1">
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

                    {/* Badges */}
                    <div className="flex items-center gap-1">
                      {hasBillsDue && (
                        <span
                          title={`Vencimento de ${dayData.isDueDayForBills.map((b) => b.description).join(', ')}`}
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
                        <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium hidden sm:block">
                          Meta diária:
                        </div>
                        <div className="text-xs sm:text-sm md:text-base font-bold text-emerald-400 tracking-tight leading-tight font-mono">
                          {formatCurrency(dayData.totalDayTarget)}
                        </div>
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
                </button>
              );
            })}
          </div>

          {/* Month Legend */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-800 border border-slate-600 inline-block" />
                <span>Trabalho (com meta)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-950 border border-slate-800 opacity-60 inline-block" />
                <span>Folga</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>Vencimento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fechamento Salvo</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 italic">
              Toque em qualquer dia para ver os detalhes completos.
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW MODE 2: SEMANA (Week View) --- */}
      {viewMode === 'week' && (
        <div className="space-y-3 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {weekDaysData.map(({ dateStr, dayData, isToday, isSelected, dateObj }) => {
              const isWork = dayData.isWorkDay;
              const hasBillsDue = dayData.isDueDayForBills.length > 0;
              const hasClosure = dayData.hasClosure;
              const weekdayName = WEEKDAYS_BR.find((w) => w.id === dateObj.getDay())?.name || '';
              const dayOfMonth = dateObj.getDate();

              return (
                <div
                  key={dateStr}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'ring-2 ring-emerald-400 bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
                      : isWork
                      ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/70 border-slate-850 opacity-75'
                  }`}
                >
                  {/* Top: Weekday & Badges */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {weekdayName}
                      </span>
                      <div className="flex items-center gap-1">
                        {isToday && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Hoje
                          </span>
                        )}
                        {hasClosure && (
                          <span title="Fechamento Salvo">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          </span>
                        )}
                        {hasBillsDue && (
                          <span title="Vencimento de contas">
                            <Bell className="w-4 h-4 text-amber-400" />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-black text-slate-100">{dayOfMonth}</span>
                      <span className="text-xs text-slate-400">
                        {MONTH_NAMES_BR[dateObj.getMonth()].slice(0, 3)}
                      </span>
                    </div>

                    {/* Target / Status info */}
                    {isWork ? (
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-3">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Meta de Reserva:
                        </span>
                        <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                          {formatCurrency(dayData.totalDayTarget)}
                        </div>
                        {dayData.billTargets.length > 0 && (
                          <div className="text-[11px] text-slate-400 mt-1">
                            {dayData.billTargets.length} {dayData.billTargets.length === 1 ? 'conta ativa' : 'contas ativas'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-850 mb-3 text-center">
                        <span className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5">
                          <BedDouble className="w-4 h-4" />
                          <span>Dia de Folga</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setSelectedDateModal(dateStr);
                      }}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-colors cursor-pointer text-center"
                    >
                      Ver Detalhes
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenClosureForDay(dateStr)}
                      className="w-full py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{hasClosure ? 'Editar Fechamento' : 'Lançar Fechamento'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- VIEW MODE 3: DIA (Day View) --- */}
      {viewMode === 'day' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6 animate-in fade-in">
          {/* Day Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {currentDayWeekday}
                </span>
                {selectedDate === todayStr && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Hoje
                  </span>
                )}
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
                {formatDateBR(selectedDate)}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleDayOverride(selectedDate, currentDayData.isWorkDay)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-colors cursor-pointer ${
                  currentDayData.isWorkDay
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {currentDayData.isWorkDay ? (
                  <>
                    <BedDouble className="w-4 h-4 text-amber-400" />
                    <span>Mudar para Folga</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    <span>Mudar para Dia de Trabalho</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onOpenClosureForDay(selectedDate)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <CheckSquare className="w-4 h-4" />
                <span>{currentDayClosure ? 'Editar Fechamento' : 'Lançar Fechamento'}</span>
              </button>
            </div>
          </div>

          {/* Key Day Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Meta do Dia
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {currentDayData.isWorkDay ? formatCurrency(currentDayData.totalDayTarget) : 'R$ 0,00'}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {currentDayData.isWorkDay ? 'Valor a reservar das contas ativas' : 'Dia livre / Folga'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Fechamento Registrado
              </span>
              <div className="text-2xl font-black text-slate-100 font-mono mt-1">
                {currentDayClosure
                  ? formatCurrency(currentDayClosure.grossEarnings)
                  : 'Pendente'}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {currentDayClosure
                  ? `Combustível: ${formatCurrency(currentDayClosure.fuelExpenses || 0)}`
                  : 'Nenhum fechamento salvo ainda'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Contas com Vencimento
              </span>
              <div className="text-2xl font-black text-amber-300 font-mono mt-1">
                {currentDayData.isDueDayForBills.length}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {currentDayData.isDueDayForBills.length > 0
                  ? currentDayData.isDueDayForBills.map((b) => b.description).join(', ')
                  : 'Nenhum boleto vence nesta data'}
              </span>
            </div>
          </div>

          {/* Active Bill Targets for this Day */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Distribuição de Contas para esta data:</span>
              <span className="text-slate-500 font-normal">
                {currentDayData.billTargets.length} contas calculadas
              </span>
            </div>

            {currentDayData.billTargets.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                Nenhuma cota diária prevista para este dia.
              </div>
            ) : (
              <div className="space-y-2">
                {currentDayData.billTargets.map((bt) => {
                  const bill = bills.find((b) => b.id === bt.billId);
                  const closureStatus = currentDayClosure?.billsStatus?.[bt.billId];

                  return (
                    <div
                      key={bt.billId}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-100 truncate">
                          {bill?.description || 'Conta'}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Total: {formatCurrency(bill?.amount || 0)} · Vence dia {bill?.dueDay}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Cota do dia</span>
                          <span className="font-bold text-emerald-400 font-mono text-sm">
                            {formatCurrency(bt.targetAmount)}
                          </span>
                        </div>

                        {closureStatus && (
                          <span
                            className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                              closureStatus.saved
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {closureStatus.saved ? 'Guardado (SIM)' : 'Não Guardado'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Day Details Modal (Opens on day click in Month/Week view) */}
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
