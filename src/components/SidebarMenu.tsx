import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  LogOut,
  Download,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  PiggyBank,
  Cloud,
  RefreshCw,
  AlertCircle,
  CloudOff,
  Car,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { SyncStatus } from '../services/dataService';
import { ConfirmModal } from './ConfirmModal';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null;
  totalReserved: number;
  syncStatus: SyncStatus;
  onOpenBackup: () => void;
  onOpenResetMonthModal: () => void;
  onOpenWizard: () => void;
  onLogout: () => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  onClose,
  userEmail,
  totalReserved,
  syncStatus,
  onOpenBackup,
  onOpenResetMonthModal,
  onOpenWizard,
  onLogout,
}) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    isDestructive: true,
    action: () => {},
  });
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 text-white font-bold">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 leading-tight">MotoristaPro</h2>
              <span className="text-[11px] text-slate-400">Menu & Configurações</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* User Profile Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-base flex items-center justify-center shrink-0">
                {userEmail ? userEmail.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Conta Pessoal Conectada
                </div>
                <div className="text-sm font-bold text-slate-100 truncate" title={userEmail || ''}>
                  {userEmail || 'Usuário Autenticado'}
                </div>
              </div>
            </div>

            {/* Cloud Sync Status */}
            <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-xs">
              <span className="text-slate-400">Status da Nuvem:</span>
              <div className="flex items-center gap-1.5 font-medium">
                {syncStatus === 'synced' && (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Sincronizado</span>
                  </>
                )}
                {syncStatus === 'saving' && (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span className="text-amber-400">Salvando...</span>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-400">Erro na Sincronização</span>
                  </>
                )}
                {syncStatus === 'local_only' && (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-400">Modo Local</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Reserve Summary Card (Secondary Info relocated from header) */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/30 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <PiggyBank className="w-4 h-4" />
              <span>Já Reservado no Mês (SIM)</span>
            </div>
            <div className="text-2xl font-black text-emerald-300 font-mono">
              {formatCurrency(totalReserved)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Acumulado das parcelas já guardadas em fechamentos diários concluídos.
            </p>
          </div>

          {/* Action Tools Section */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Ferramentas & Dados
            </div>

            {/* Backup & Restore */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBackup();
              }}
              className="w-full p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-3 transition-colors text-left cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-slate-700/60 text-slate-200 shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-100">Backup & Restauração</div>
                <div className="text-xs text-slate-400 truncate">Exportar ou importar arquivo JSON</div>
              </div>
            </button>

            {/* Botão Zerar */}
            <button
              type="button"
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: 'Confirmar zeragem',
                  message: 'Tem certeza de que deseja zerar os valores? Essa ação poderá alterar os dados financeiros registrados.',
                  confirmText: 'Sim, zerar',
                  cancelText: 'Cancelar',
                  isDestructive: true,
                  action: () => {
                    onClose();
                    onOpenResetMonthModal();
                  },
                });
              }}
              className="w-full p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-3 transition-colors text-left cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400 shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-100">Zerar</div>
                <div className="text-xs text-slate-400 truncate">Zerar fechamentos ou dados do mês</div>
              </div>
            </button>

            {/* Botão Ajustar Mês */}
            <button
              type="button"
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: 'Confirmar ajuste do mês',
                  message: 'Tem certeza de que deseja ajustar o mês selecionado? Os valores poderão ser alterados.',
                  confirmText: 'Sim, ajustar',
                  cancelText: 'Cancelar',
                  isDestructive: false,
                  action: () => {
                    onClose();
                    onOpenResetMonthModal();
                  },
                });
              }}
              className="w-full p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-3 transition-colors text-left cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-300 shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-100">Ajustar Mês</div>
                <div className="text-xs text-slate-400 truncate">Ajustar valores acumulados no mês</div>
              </div>
            </button>

            {/* Reopen Wizard */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWizard();
              }}
              className="w-full p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-3 transition-colors text-left cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-100">Assistente Passo a Passo</div>
                <div className="text-xs text-slate-400 truncate">Recadastrar contas e folgas guiado</div>
              </div>
            </button>
          </div>

          {/* Privacy & Security Note */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-850 flex items-center gap-2.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Sua conta está protegida por regras RLS no Supabase.</span>
          </div>
        </div>

        {/* Drawer Footer with Logout */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta Pessoal</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText || 'Cancelar'}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
