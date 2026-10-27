import React from 'react';
import { Car, Cloud, CloudOff, RefreshCw, AlertCircle, Menu } from 'lucide-react';
import { formatDateLongBR, getTodayStr } from '../utils/formatters';
import { SyncStatus } from '../services/dataService';

interface HeaderProps {
  syncStatus: SyncStatus;
  userEmail: string | null;
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  syncStatus,
  userEmail,
  onOpenSidebar,
}) => {
  const todayStr = getTodayStr();
  const formattedToday = formatDateLongBR(todayStr);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Logo & App Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-white font-bold ring-1 ring-emerald-400/20 shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">MotoristaPro</h1>
                <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Diária & Custos
                </span>
              </div>
              <p className="text-xs text-slate-400 capitalize">{formattedToday}</p>
            </div>
          </div>

          {/* Right Slot: Cloud Sync Status + Hamburger Menu Button */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Cloud Sync Status Indicator */}
            <div
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-colors ${
                syncStatus === 'synced'
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : syncStatus === 'saving'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                  : syncStatus === 'error'
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
              }`}
              title={
                userEmail
                  ? `Conectado: ${userEmail}`
                  : 'Modo de dados local'
              }
            >
              {syncStatus === 'synced' && (
                <>
                  <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">Nuvem Sincronizada</span>
                  <span className="sm:hidden text-[11px]">Sincronizado</span>
                </>
              )}
              {syncStatus === 'saving' && (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Salvando na nuvem...</span>
                  <span className="sm:hidden text-[11px]">Salvando...</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="hidden sm:inline">Erro de sincronização</span>
                  <span className="sm:hidden text-[11px]">Erro sincronização</span>
                </>
              )}
              {syncStatus === 'local_only' && (
                <>
                  <CloudOff className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="hidden sm:inline">Modo Local</span>
                  <span className="sm:hidden text-[11px]">Local</span>
                </>
              )}
            </div>

            {/* Hamburger Menu Trigger (Opens SidebarMenu Drawer) */}
            <button
              type="button"
              onClick={onOpenSidebar}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 flex items-center gap-2 transition-colors cursor-pointer text-xs font-semibold shadow-sm"
              title="Abrir menu de opções e perfil"
              aria-label="Abrir menu"
            >
              <Menu className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
