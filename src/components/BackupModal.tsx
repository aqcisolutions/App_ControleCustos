import React, { useState, useRef } from 'react';
import { X, Download, Upload, FileCheck, AlertTriangle, Check, ShieldCheck } from 'lucide-react';
import { Bill, DailyClosure, WorkSchedule } from '../types';
import { validateBackupJson, downloadBackupFile, BackupData } from '../utils/backupValidator';
import { formatCurrency } from '../utils/formatters';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  schedule: WorkSchedule;
  closures: Record<string, DailyClosure>;
  onRestoreBackup: (backup: BackupData) => Promise<void>;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  bills,
  schedule,
  closures,
  onRestoreBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateBackupJson> | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    downloadBackupFile(bills, schedule, closures);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportSuccess(false);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = validateBackupJson(content);
      setValidationResult(res);
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!validationResult || !validationResult.valid || !validationResult.data) return;

    try {
      setImporting(true);
      await onRestoreBackup(validationResult.data);
      setImportSuccess(true);
      setValidationResult(null);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error restoring backup:', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-100 p-1 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Backup e Restauração
            </h2>
            <p className="text-xs text-slate-400">
              Exporte seus dados para um arquivo seguro ou restaure um backup anterior
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-950 p-1 mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('export');
              setValidationResult(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'export'
                ? 'bg-slate-800 text-emerald-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Exportar Arquivo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'bg-slate-800 text-emerald-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Restaurar do Arquivo</span>
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-300 block">Conteúdo atual pronto para exportação:</span>
              <ul className="space-y-1 text-slate-400 list-disc list-inside">
                <li><strong className="text-slate-200">{bills.length} contas</strong> ({formatCurrency(bills.reduce((s, b) => s + b.amount, 0))}/mês)</li>
                <li><strong className="text-slate-200">{Object.keys(closures).length} fechamentos</strong> registrados</li>
                <li>Rotina de folgas e exceções no calendário</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleExport}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo JSON de Backup</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {!validationResult && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-950/50 hover:bg-slate-950 transition-colors cursor-pointer group"
              >
                <div className="p-3 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-slate-200">
                  Clique para selecionar o arquivo de backup (.json)
                </span>
                <span className="text-xs text-slate-500">
                  Validação automática e imediata da integridade dos dados
                </span>
              </button>
            )}

            {validationResult && !validationResult.valid && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Arquivo Inválido ou Incompatível</span>
                </div>
                <p>{validationResult.error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setValidationResult(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="mt-2 text-rose-400 hover:underline text-xs"
                >
                  Tentar outro arquivo
                </button>
              </div>
            )}

            {validationResult && validationResult.valid && validationResult.summary && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <FileCheck className="w-4 h-4 shrink-0" />
                  <span>Arquivo verificado com sucesso!</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Contas Encontradas</span>
                    <strong className="text-slate-100">{validationResult.summary.billsCount}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Fechamentos</span>
                    <strong className="text-slate-100">{validationResult.summary.closuresCount}</strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                  <strong>Atenção:</strong> Restaurar este backup substituirá as contas e fechamentos atuais pelo conteúdo do arquivo.
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleConfirmRestore}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {importing ? (
                      <span className="inline-block animate-spin w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirmar e Restaurar</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValidationResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs border border-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {importSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Backup restaurado com sucesso! Atualizando tela...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
