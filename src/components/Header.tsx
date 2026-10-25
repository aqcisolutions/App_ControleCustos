import React, { useState } from 'react';
import { Calendar, CheckSquare, PiggyBank, Settings, Car, RotateCcw, Cloud, CloudOff, RefreshCw, User, LogOut, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency, getTodayStr, formatDateLongBR } from '../utils/formatters';
import { SyncStatus } from '../services/dataService';

interface HeaderProps {
  activeTab: 'calendar' | 'closure' | 'vault' | 'settings';
  setActiveTab: (tab: 'calendar' | 'closure' | 'vault' | 'settings') => void;
  totalMonthlyBills: number;
  totalReserved: number;
  todayTarget: number;
  todayIsWorkDay: boolean;
  onOpenResetMonthModal?: () => void;
  syncStatus: SyncStatus;
  userEmail: string | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenBackup: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalMonthlyBills,
  totalReserved,
  todayTarget,
  todayIsWorkDay,
  onOpenResetMonthModal,
  syncStatus,
  userEmail,
  onOpenAuth,
  onLogout,
  onOpenBackup,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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

            {/* Mobile quick actions & status */}
            <div className="md:hidden flex items-center gap-2">
              {/* Sync status pill (Mobile) */}
              <button
                type="button"
                onClick={userEmail ? undefined : onOpenAuth}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : syncStatus === 'saving'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : syncStatus === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title={userEmail ? `Conectado: ${userEmail}` : 'Clique para conectar na nuvem'}
              >
                {syncStatus === 'synced' && <Cloud className="w-4 h-4 text-emerald-400" />}
                {syncStatus === 'saving' && <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />}
                {syncStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                {syncStatus === 'local_only' && <CloudOff className="w-4 h-4 text-slate-400" />}
              </button>

              {userEmail ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 border border-slate-700 text-xs"
                  title="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  Entrar
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar & Cloud Sync (Desktop) */}
          <div className="hidden md:flex items-center gap-3 text-xs">
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

            {/* Cloud Sync Status Pill (Desktop) */}
            <div
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium ${
                syncStatus === 'synced'
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                  : syncStatus === 'saving'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                  : syncStatus === 'error'
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
              }`}
            >
              {syncStatus === 'synced' && (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nuvem Sincronizada</span>
                </>
              )}
              {syncStatus === 'saving' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Salvando na nuvem...</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Erro de sincronização</span>
                </>
              )}
              {syncStatus === 'local_only' && (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Modo Local</span>
                </>
              )}
            </div>

            {/* Backup Button */}
            <button
              type="button"
              onClick={onOpenBackup}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Exportar ou restaurar backup em arquivo JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup</span>
            </button>

            {/* User Auth Profile */}
            {userEmail ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    {userEmail.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{userEmail}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in">
                    <div className="px-3 py-2 text-[11px] text-slate-400 border-b border-slate-800">
                      Sessão Pessoal Conectada
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-slate-800/80 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair da conta</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Entrar / Conectar</span>
              </button>
            )}

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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
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
