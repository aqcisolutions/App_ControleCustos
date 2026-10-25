import React, { useState } from 'react';
import { CloudUpload, ShieldAlert, Check, X, ArrowRight } from 'lucide-react';
import { Bill, DailyClosure, WorkSchedule } from '../types';
import { formatCurrency } from '../utils/formatters';

import { extractErrorMessage } from '../services/dataService';

interface MigrationModalProps {
  isOpen: boolean;
  bills: Bill[];
  closures: Record<string, DailyClosure>;
  onConfirmMigration: () => Promise<void>;
  onDismiss: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  isOpen,
  bills,
  closures,
  onConfirmMigration,
  onDismiss,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const closuresCount = Object.keys(closures).length;
  const billsCount = bills.length;
  const totalBillsAmount = bills.reduce((sum, b) => sum + b.amount, 0);

  const handleMigrate = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await onConfirmMigration();
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err, 'Falha na sincronização dos dados com a nuvem.'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CloudUpload className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Sincronizar Dados Locais com a Nuvem
            </h2>
            <p className="text-xs text-slate-400">
              Detectamos registros salvos neste navegador antes do login
            </p>
          </div>
        </div>

        <div className="mb-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Resumo dos dados encontrados:
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="text-slate-400 text-xs block">Contas Fixas</span>
              <strong className="text-slate-100 text-base">{billsCount} contas</strong>
              <span className="text-emerald-400 text-xs block font-mono mt-0.5">
                {formatCurrency(totalBillsAmount)}/mês
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="text-slate-400 text-xs block">Fechamentos Diários</span>
              <strong className="text-slate-100 text-base">{closuresCount} dias</strong>
              <span className="text-slate-500 text-xs block mt-0.5">
                Histórico de faturamento
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={handleMigrate}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Salvar esses dados na minha conta na nuvem</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onDismiss}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <span>Descartar dados locais e usar dados da nuvem</span>
          </button>
        </div>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          Uma cópia de segurança preventiva é arquivada automaticamente no navegador antes da sincronização.
        </p>
      </div>
    </div>
  );
};
