import React from 'react';
import { Calendar, CheckSquare, PiggyBank, Settings, Car, RotateCcw } from 'lucide-react';
import { formatCurrency, getTodayStr, formatDateLongBR } from '../utils/formatters';

interface HeaderProps {
  activeTab: 'calendar' | 'closure' | 'vault' | 'settings';
  setActiveTab: (tab: 'calendar' | 'closure' | 'vault' | 'settings') => void;
  totalMonthlyBills: number;
  totalReserved: number;
  todayTarget: number;
  todayIsWorkDay: boolean;
  onOpenResetMonthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalMonthlyBills,
  totalReserved,
  todayTarget,
  todayIsWorkDay,
  onOpenResetMonthModal,
}) => {
  const todayStr = getTodayStr();
  const formattedToday = formatDateLongBR(todayStr);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Brand & Live Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & App Name */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-white font-bold">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-100 tracking-tight">MotoristaPro</h1>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Diária & Custos
                  </span>
                </div>
                <p className="text-xs text-slate-400 capitalize">{formattedToday}</p>
              </div>
            </div>

            {/* Mobile quick badge */}
            <div className="md:hidden text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Meta Hoje</div>
              <div className={`text-sm font-bold ${todayIsWorkDay ? 'text-emerald-400' : 'text-slate-400'}`}>
                {todayIsWorkDay ? formatCurrency(todayTarget) : 'Folga 😴'}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar (Desktop) */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div className="px-3.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Total de Contas</div>
              <div className="text-sm font-bold text-slate-100">{formatCurrency(totalMonthlyBills)}</div>
            </div>

            <div className="px-3.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50">
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-medium">Já Reservado (SIM)</div>
              <div className="text-sm font-bold text-emerald-300">{formatCurrency(totalReserved)}</div>
            </div>

            <div className="px-3.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Meta Hoje</div>
              <div className={`text-sm font-bold ${todayIsWorkDay ? 'text-amber-300' : 'text-slate-400'}`}>
                {todayIsWorkDay ? formatCurrency(todayTarget) : 'Dia de Folga'}
              </div>
            </div>

            {onOpenResetMonthModal && (
              <button
                type="button"
                onClick={onOpenResetMonthModal}
                className="px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold transition-all flex items-center gap-1.5"
                title="Zerar dados e iniciar mês com valores já acumulados"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Zerar / Mês</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendário & Diárias</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('closure')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'closure'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Fechamento do Dia</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'vault'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <PiggyBank className="w-4 h-4" />
            <span>Cofre & Metas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Contas & Folgas</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
