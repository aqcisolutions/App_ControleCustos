import React from 'react';
import { AlertOctagon, RotateCcw, Trash2, X, Sparkles, CheckSquare, Layers } from 'lucide-react';

interface ResetMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetAllBlank: () => void;
  onResetOnlyClosures: () => void;
  onResetToDefaults: () => void;
}

export const ResetMonthModal: React.FC<ResetMonthModalProps> = ({
  isOpen,
  onClose,
  onResetAllBlank,
  onResetOnlyClosures,
  onResetToDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Zerar e Ajustar Mês</h3>
              <p className="text-xs text-slate-400">
                Como o mês já começou, você pode zerar os dados e lançar valores já acumulados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Cards */}
        <div className="space-y-3">
          {/* Option 1: Zerar Tudo (Contas e Histórico) */}
          <button
            type="button"
            onClick={() => {
              onResetAllBlank();
              onClose();
            }}
            className="w-full text-left p-4 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-800/40 hover:border-rose-600 transition-all flex items-start gap-3.5 group"
          >
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-rose-200 group-hover:text-rose-100 flex items-center justify-between">
                <span>Zerar Tudo do Zero (Limpar Tudo)</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/30 text-rose-200">
                  Mais Recomendado
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Apaga as contas de teste e todos os fechamentos. Permite cadastrar suas contas reais com os <strong>valores que você já acumulou</strong> até hoje neste mês.
              </p>
            </div>
          </button>

          {/* Option 2: Zerar Apenas os Fechamentos */}
          <button
            type="button"
            onClick={() => {
              onResetOnlyClosures();
              onClose();
            }}
            className="w-full text-left p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all flex items-start gap-3.5 group"
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-100 group-hover:text-white">
                Zerar Apenas os Fechamentos Diários
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Mantém as contas cadastradas intactas, mas apaga o histórico de fechamentos para começar a registrar a partir de hoje.
              </p>
            </div>
          </button>

          {/* Option 3: Restaurar Exemplo Padrão */}
          <button
            type="button"
            onClick={() => {
              onResetToDefaults();
              onClose();
            }}
            className="w-full text-left p-3.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-slate-200 transition-all flex items-center gap-3 text-xs"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Restaurar contas de exemplo (Aluguel R$ 1680 dia 12, Luz R$ 350, Água R$ 150)</span>
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
