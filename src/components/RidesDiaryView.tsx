import React, { useState, useMemo } from 'react';
import {
  Car,
  Calendar,
  Clock,
  DollarSign,
  Fuel,
  TrendingUp,
  History,
  PlusCircle,
  Edit2,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Search,
  ChevronRight,
  Info,
  Copy,
  Check,
  Download,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  RideLogEntry,
  RidePlatform,
  RideLogConflict,
  RideBackupSnapshot,
  RideCloudStatus,
} from '../types';
import {
  getTodayStr,
  formatDateBR,
  formatDateLongBR,
  formatCurrency,
  MONTH_NAMES_BR,
} from '../utils/formatters';
import {
  hoursAndMinutesToDecimal,
  decimalToHoursAndMinutes,
  formatDurationHoursMinutes,
  calculateRideMetrics,
  formatGrossPerHour,
  formatAveragePerRide,
  formatGrossPerKm,
  formatRidesPerHour,
  formatValueAfterFuel,
  formatFuelCostPerKm,
  calculatePeriodSummary,
} from '../utils/rideCalculator';
import {
  exportRideLogsToJson,
  backupLocalRideLogsBeforeSync,
  listRideBackups,
  restoreRideLogsFromBackup,
  loadRideConflicts,
  resolveRideConflict,
} from '../services/ridesService';
import { ConfirmModal } from './ConfirmModal';

interface RidesDiaryViewProps {
  logs: Record<string, RideLogEntry>;
  onSaveLog: (entry: Omit<RideLogEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDeleteLog: (dateStr: string) => Promise<void>;
  onBackToDashboard: () => void;
  cloudAvailable: boolean;
  cloudError?: string;
  cloudStatus?: RideCloudStatus;
  userId?: string;
  onReloadLogs?: () => Promise<void>;
}

export const RidesDiaryView: React.FC<RidesDiaryViewProps> = ({
  logs,
  onSaveLog,
  onDeleteLog,
  onBackToDashboard,
  cloudAvailable,
  cloudError,
  cloudStatus = 'local_only',
  userId,
  onReloadLogs,
}) => {

  const todayStr = getTodayStr();

  // Tab navigation inside module
  const [activeSubTab, setActiveSubTab] = useState<'register' | 'performance' | 'history'>('register');

  // Form State
  const [dateInput, setDateInput] = useState<string>(todayStr);
  const [platformInput, setPlatformInput] = useState<RidePlatform>('ambas');
  const [kmInput, setKmInput] = useState<string>('');
  const [hoursInput, setHoursInput] = useState<string>('8');
  const [minutesInput, setMinutesInput] = useState<string>('0');
  const [ridesInput, setRidesInput] = useState<string>('');
  const [grossInput, setGrossInput] = useState<string>('');
  const [fuelInput, setFuelInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // History filtering
  const todayDateObj = new Date();
  const [historyYear, setHistoryYear] = useState<number>(todayDateObj.getFullYear());
  const [historyMonth, setHistoryMonth] = useState<number>(todayDateObj.getMonth());
  const [searchDateQuery, setSearchDateQuery] = useState<string>('');

  // Confirm delete modal
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    date: string;
  }>({ isOpen: false, date: '' });

  // Migration modal helper
  const [showSqlMigration, setShowSqlMigration] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Conflicts and Backup State
  const [conflicts, setConflicts] = useState<Record<string, RideLogConflict>>(() => loadRideConflicts());
  const [selectedConflict, setSelectedConflict] = useState<RideLogConflict | null>(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState<boolean>(false);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [availableBackups, setAvailableBackups] = useState<RideBackupSnapshot[]>(() => listRideBackups());

  // Check if date being edited already has a record
  const existingRecordForSelectedDate = logs[dateInput];

  // Calculated decimal hours for live feedback
  const liveDecimalHours = hoursAndMinutesToDecimal(
    Number(hoursInput) || 0,
    Number(minutesInput) || 0
  );

  // Live metrics for the form
  const liveMetrics = useMemo(() => {
    return calculateRideMetrics({
      grossEarnings: Number(grossInput) || 0,
      fuelExpenses: Number(fuelInput) || 0,
      hoursDriven: liveDecimalHours,
      kmDriven: Number(kmInput) || 0,
      totalRides: Number(ridesInput) || 0,
    });
  }, [grossInput, fuelInput, liveDecimalHours, kmInput, ridesInput]);

  // Backup and Conflict handlers
  const handleExportJson = () => {
    exportRideLogsToJson(logs);
    setBackupNotice('Arquivo JSON exportado para download com sucesso!');
    setTimeout(() => setBackupNotice(null), 4000);
  };

  const handleCreateSnapshot = () => {
    const res = backupLocalRideLogsBeforeSync();
    if (res) {
      setAvailableBackups(listRideBackups());
      setBackupNotice(`Snapshot preventivo criado com sucesso (${res.count} registros salvos no histórico local).`);
    } else {
      setBackupNotice('Nenhum registro encontrado para criar snapshot.');
    }
    setTimeout(() => setBackupNotice(null), 4000);
  };

  const handleOpenRestoreModal = () => {
    setAvailableBackups(listRideBackups());
    setShowRestoreModal(true);
  };

  const handleRestoreFromSnapshot = async (backupKey: string) => {
    const res = restoreRideLogsFromBackup(backupKey);
    if (res.success && res.logs) {
      if (onReloadLogs) {
        await onReloadLogs();
      }
      setShowRestoreModal(false);
      setBackupNotice('Registros restaurados com sucesso a partir do snapshot selecionado!');
      setTimeout(() => setBackupNotice(null), 4000);
    } else {
      setSaveErrorMsg(res.error || 'Erro ao restaurar snapshot');
    }
  };

  const handleResolveConflictDecision = async (conflictId: string, decision: 'keep_local' | 'keep_cloud') => {
    setIsResolvingConflict(true);
    try {
      const res = await resolveRideConflict(conflictId, decision, logs, userId);
      if (res.success) {
        setConflicts(loadRideConflicts());
        setSelectedConflict(null);
        if (onReloadLogs) {
          await onReloadLogs();
        }
      } else {
        setSaveErrorMsg(res.error || 'Erro ao resolver conflito');
      }
    } finally {
      setIsResolvingConflict(false);
    }
  };

  // Load existing entry into form
  const handleLoadEntryIntoForm = (entry: RideLogEntry) => {

    setDateInput(entry.date);
    setPlatformInput(entry.platform);
    setKmInput(entry.kmDriven > 0 ? String(entry.kmDriven) : '');
    const { hours, minutes } = decimalToHoursAndMinutes(entry.hoursDriven);
    setHoursInput(String(hours));
    setMinutesInput(String(minutes));
    setRidesInput(entry.totalRides > 0 ? String(entry.totalRides) : '');
    setGrossInput(entry.grossEarnings > 0 ? String(entry.grossEarnings) : '');
    setFuelInput(entry.fuelExpenses > 0 ? String(entry.fuelExpenses) : '');
    setNotesInput(entry.notes || '');
    setEditingId(entry.id);
    setActiveSubTab('register');
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  };

  // Reset Form
  const handleClearForm = () => {
    setDateInput(todayStr);
    setPlatformInput('ambas');
    setKmInput('');
    setHoursInput('8');
    setMinutesInput('0');
    setRidesInput('');
    setGrossInput('');
    setFuelInput('');
    setNotesInput('');
    setEditingId(null);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    const km = Number(kmInput) || 0;
    const decimalHours = hoursAndMinutesToDecimal(Number(hoursInput) || 0, Number(minutesInput) || 0);
    const rides = Number(ridesInput) || 0;
    const gross = Number(grossInput) || 0;
    const fuel = Number(fuelInput) || 0;

    if (!dateInput) {
      setSaveErrorMsg('Informe a data de referência.');
      return;
    }

    try {
      await onSaveLog({
        id: editingId || undefined,
        date: dateInput,
        platform: platformInput,
        kmDriven: km,
        hoursDriven: decimalHours,
        totalRides: rides,
        grossEarnings: gross,
        fuelExpenses: fuel,
        notes: notesInput.trim() || undefined,
      });

      const savedDate = dateInput;

      // Limpa automaticamente os campos do formulário para preparar novo registro somente após salvamento confirmado
      setDateInput(todayStr);
      setPlatformInput('ambas');
      setKmInput('');
      setHoursInput('8');
      setMinutesInput('0');
      setRidesInput('');
      setGrossInput('');
      setFuelInput('');
      setNotesInput('');
      setEditingId(null);

      setSaveSuccessMsg(`Registro de ${formatDateBR(savedDate)} salvo com sucesso!`);

      // Auto dismiss success message after 4s
      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar registro de corridas';
      setSaveErrorMsg(msg);
      // Os campos digitados são preservados intactos em caso de erro para permitir nova tentativa
    }
  };


  // History entries sorted
  const sortedHistoryEntries = useMemo(() => {
    return Object.values(logs).sort((a, b) => b.date.localeCompare(a.date));
  }, [logs]);

  // Filtered history entries by selected month/year or search
  const filteredHistoryEntries = useMemo(() => {
    if (searchDateQuery.trim() !== '') {
      const q = searchDateQuery.trim();
      return sortedHistoryEntries.filter((e) => e.date.includes(q) || formatDateBR(e.date).includes(q));
    }

    const monthPrefix = `${historyYear}-${String(historyMonth + 1).padStart(2, '0')}`;
    return sortedHistoryEntries.filter((e) => e.date.startsWith(monthPrefix));
  }, [sortedHistoryEntries, historyYear, historyMonth, searchDateQuery]);

  // Period summary
  const periodSummary = useMemo(() => {
    return calculatePeriodSummary(filteredHistoryEntries);
  }, [filteredHistoryEntries]);

  const SQL_MIGRATION_TEXT = `-- Executar no SQL Editor do Supabase para sincronizar em nuvem:
create table if not exists public.ride_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ride_date date not null,
  platform text not null check (platform in ('uber', '99', 'ambas')),
  km_driven numeric(10,2) not null default 0,
  hours_driven numeric(6,2) not null default 0,
  total_rides integer not null default 0,
  gross_earnings numeric(12,2) not null default 0,
  fuel_expenses numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ride_logs_user_date_key unique (user_id, ride_date)
);

alter table public.ride_logs enable row level security;

create policy "Users can view their own ride logs" on public.ride_logs for select using (auth.uid() = user_id);
create policy "Users can insert their own ride logs" on public.ride_logs for insert with check (auth.uid() = user_id);
create policy "Users can update their own ride logs" on public.ride_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own ride logs" on public.ride_logs for delete using (auth.uid() = user_id);
create index if not exists idx_ride_logs_user_date on public.ride_logs(user_id, ride_date desc);
grant select, insert, update, delete on public.ride_logs to authenticated;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_TEXT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Navigation & Module Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Voltar ao painel principal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-[11px] uppercase font-bold tracking-wider text-teal-400 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                <span>Módulo Operacional</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
                Diário de Corridas
              </h2>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveSubTab('register')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'register'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Registrar Dia</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('performance')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'performance'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Desempenho</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'history'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico</span>
            </button>
          </div>
        </div>

        {/* Backup & Safety Controls Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Segurança de Dados:</span>
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              title="Baixar arquivo JSON com todos os registros locais para guarda externa"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span>Exportar JSON</span>
            </button>

            <button
              type="button"
              onClick={handleCreateSnapshot}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              title="Criar cópia de segurança preventiva no navegador"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Snapshot Local</span>
            </button>

            {availableBackups.length > 0 && (
              <button
                type="button"
                onClick={handleOpenRestoreModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                title="Ver lista de backups para restauração"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restaurar ({availableBackups.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {cloudStatus === 'synced' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Nuvem Ativa</span>
              </span>
            )}
            {cloudStatus === 'table_not_found' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                <Info className="w-3.5 h-3.5" />
                <span>Modo Local (Migração Pendente)</span>
              </span>
            )}
            {cloudStatus === 'conflict' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Conflito Detectado</span>
              </span>
            )}
            {cloudStatus === 'offline' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                <Info className="w-3.5 h-3.5" />
                <span>Modo Offline</span>
              </span>
            )}
          </div>
        </div>

        {/* Feedback message for backup actions */}
        {backupNotice && (
          <div className="mt-3 p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{backupNotice}</span>
          </div>
        )}

        {/* Conflict Alert Banner if unresolved conflicts exist */}
        {Object.keys(conflicts).length > 0 && (
          <div className="mt-3 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-amber-200 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="block text-amber-300">Conflito de Sincronização Detectado</strong>
                <span>
                  Existem {Object.keys(conflicts).length} data(s) com versões divergentes entre o dispositivo e a nuvem. Seus dados estão seguros e preservados.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedConflict(Object.values(conflicts)[0])}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs shadow-md hover:bg-amber-400 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              Revisar Conflito
            </button>
          </div>
        )}


        {/* Database Status Notice if table not yet run on Supabase */}
        {cloudError && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Modo Local Ativo:</strong> Seus registros estão salvos com segurança neste dispositivo. Para sincronizar na nuvem, execute a migração SQL no Supabase.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSqlMigration(!showSqlMigration)}
              className="text-xs font-bold underline hover:text-amber-200 self-start sm:self-auto cursor-pointer"
            >
              {showSqlMigration ? 'Ocultar SQL' : 'Ver Script SQL'}
            </button>
          </div>
        )}

        {/* Optional Collapsible SQL Migration Drawer */}
        {showSqlMigration && (
          <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Script de Migração Supabase (ride_logs)</span>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-850 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
              {SQL_MIGRATION_TEXT}
            </pre>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: REGISTRAR DIA */}
      {activeSubTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Form Column (2/3 on desktop) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-teal-400">
                Lançamento Consolidado do Dia
              </div>
              <h3 className="text-xl font-bold text-slate-100 mt-0.5">
                {editingId ? 'Editar Registro de Corridas' : 'Registrar Dia de Trabalho'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Lance os totais somados de todas as plataformas e períodos trabalhados no dia.
              </p>
            </div>

            {/* Notification messages */}
            {saveSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {saveErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{saveErrorMsg}</span>
              </div>
            )}

            {existingRecordForSelectedDate && !editingId && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Já existe um registro para o dia <strong>{formatDateBR(dateInput)}</strong>. Ao salvar, os dados serão atualizados sem duplicar.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleLoadEntryIntoForm(existingRecordForSelectedDate)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs shrink-0 cursor-pointer"
                >
                  Carregar dados
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Data & Plataforma */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Data */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Data de Referência
                  </label>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => {
                      setDateInput(e.target.value);
                      setSaveSuccessMsg(null);
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Plataforma: Aceita estritamente Uber, 99 ou Ambas */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Plataforma Utilizada
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['uber', '99', 'ambas'] as RidePlatform[]).map((p) => {
                      const isSelected = platformInput === p;
                      const label = p === 'uber' ? 'Uber' : p === '99' ? '99' : 'Ambas';
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPlatformInput(p)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                            isSelected
                              ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 2: Horas Efetivamente Dirigidas (Horas e Minutos) */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>Horas Efetivamente Dirigidas</span>
                  </label>
                  <span className="text-xs font-mono text-teal-400 font-bold">
                    = {liveDecimalHours.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} horas
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Some os períodos no trânsito excluindo intervalos de almoço e paradas.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Horas inteiras
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={hoursInput}
                        onChange={(e) => setHoursInput(e.target.value)}
                        placeholder="Ex: 8"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 pr-9"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 pointer-events-none">
                        horas
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Minutos
                    </label>
                    <div className="relative">
                      <select
                        value={minutesInput}
                        onChange={(e) => setMinutesInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="0">00 min (0,0h)</option>
                        <option value="15">15 min (0,25h)</option>
                        <option value="30">30 min (0,50h)</option>
                        <option value="45">45 min (0,75h)</option>
                        {Array.from({ length: 60 }).map((_, idx) => {
                          if ([0, 15, 30, 45].includes(idx)) return null;
                          return (
                            <option key={idx} value={String(idx)}>
                              {String(idx).padStart(2, '0')} min
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Quilômetros & Total de Corridas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Quilômetros Rodados no Dia
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={kmInput}
                      onChange={(e) => setKmInput(e.target.value)}
                      placeholder="Ex: 175.5"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                      km
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Total de Corridas Realizadas
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={ridesInput}
                      onChange={(e) => setRidesInput(e.target.value)}
                      placeholder="Ex: 18"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 pr-14"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                      viagens
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 4: Faturamento Bruto & Combustível */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Faturamento Bruto (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={grossInput}
                      onChange={(e) => setGrossInput(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Soma de ganhos em todas as plataformas
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Gasto com Combustível (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={fuelInput}
                      onChange={(e) => setFuelInput(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Total abastecido no dia (mesmo se múltiplos)
                  </span>
                </div>
              </div>

              {/* Row 5: Observações Opcionais */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Observações do Dia (Opcional)
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Ex: Chuva à noite, aeroporto, etc."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Limpar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-teal-500/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingId ? 'Atualizar Registro' : 'Salvar Registro do Dia'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Calculated Metrics Preview (1/3 on desktop) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-teal-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Prévia do Desempenho</span>
              </div>
              <h4 className="text-base font-bold text-slate-100 mt-0.5">
                Métricas Calculadas em Tempo Real
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Atualizadas conforme você digita os dados do dia.
              </p>
            </div>

            <div className="space-y-3">
              {/* 1. Ganhos por hora */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ganhos por Hora
                  </span>
                  <span className="text-[10px] text-slate-500">Faturamento / Horas</span>
                </div>
                <div className="text-base font-extrabold text-teal-400 font-mono">
                  {formatGrossPerHour(liveMetrics.grossPerHour)}
                </div>
              </div>

              {/* 2. Média por corrida */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Média por Corrida
                  </span>
                  <span className="text-[10px] text-slate-500">Faturamento / Viagens</span>
                </div>
                <div className="text-base font-extrabold text-slate-100 font-mono">
                  {formatAveragePerRide(liveMetrics.averagePerRide)}
                </div>
              </div>

              {/* 3. Faturamento por km */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Faturamento por Km
                  </span>
                  <span className="text-[10px] text-slate-500">Faturamento / Km</span>
                </div>
                <div className="text-base font-extrabold text-teal-400 font-mono">
                  {formatGrossPerKm(liveMetrics.grossPerKm)}
                </div>
              </div>

              {/* 4. Corridas por hora */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Corridas por Hora
                  </span>
                  <span className="text-[10px] text-slate-500">Viagens / Horas</span>
                </div>
                <div className="text-base font-extrabold text-slate-100 font-mono">
                  {formatRidesPerHour(liveMetrics.ridesPerHour)}
                </div>
              </div>

              {/* 5. Valor após combustível */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-teal-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                    Valor após Combustível
                  </span>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {formatValueAfterFuel(liveMetrics.valueAfterFuel)}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Faturamento bruto menos gasto com combustível (não é lucro líquido; não inclui pneus, manutenção e depreciação).
                </p>
              </div>

              {/* 6. Gasto combustível por km */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Combustível por Km
                  </span>
                  <span className="text-[10px] text-slate-500">Combustível / Km</span>
                </div>
                <div className="text-base font-extrabold text-amber-400 font-mono">
                  {formatFuelCostPerKm(liveMetrics.fuelCostPerKm)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DESEMPENHO (Painel Completo das 6 Métricas) */}
      {activeSubTab === 'performance' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Header of Performance */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-teal-400">
                Análise de Produtividade
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">
                Métricas Consolidadas de Desempenho
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Indicadores calculados automaticamente com base em {sortedHistoryEntries.length}{' '}
                {sortedHistoryEntries.length === 1 ? 'dia registrado' : 'dias registrados'}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Período analisado:</span>
              <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-teal-300">
                {MONTH_NAMES_BR[historyMonth]} / {historyYear}
              </span>
            </div>
          </div>

          {/* 6 Main Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Ganhos brutos por hora */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ganhos por Hora
                </span>
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-teal-400 font-mono">
                {formatGrossPerHour(periodSummary.averageGrossPerHour)}
              </div>
              <p className="text-xs text-slate-400">
                Faturamento bruto total dividido pelo total de horas dirigidas.
              </p>
            </div>

            {/* 2. Valor médio por corrida */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Média por Corrida
                </span>
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-100 font-mono">
                {periodSummary.totalRides > 0 && periodSummary.totalGross > 0
                  ? formatAveragePerRide(periodSummary.totalGross / periodSummary.totalRides)
                  : '—'}
              </div>
              <p className="text-xs text-slate-400">
                Ticket médio obtido em cada viagem realizada.
              </p>
            </div>

            {/* 3. Faturamento bruto por km */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Faturamento por Km
                </span>
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-teal-400 font-mono">
                {formatGrossPerKm(periodSummary.averageGrossPerKm)}
              </div>
              <p className="text-xs text-slate-400">
                Retorno bruto gerado para cada quilômetro rodado no período.
              </p>
            </div>

            {/* 4. Corridas por hora */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Corridas por Hora
                </span>
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <Car className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-100 font-mono">
                {periodSummary.totalHours > 0 && periodSummary.totalRides > 0
                  ? formatRidesPerHour(periodSummary.totalRides / periodSummary.totalHours)
                  : '—'}
              </div>
              <p className="text-xs text-slate-400">
                Ritmo operacional e frequência de viagens atendidas por hora.
              </p>
            </div>

            {/* 5. Valor após combustível */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Valor após Combustível
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {periodSummary.totalGross > 0 || periodSummary.totalFuel > 0
                  ? formatValueAfterFuel(periodSummary.totalValueAfterFuel)
                  : '—'}
              </div>
              <p className="text-xs text-slate-400 leading-tight">
                Faturamento bruto menos gasto registrado com combustível. Não é lucro líquido (não inclui custos de manutenção, pneus ou depreciação).
              </p>
            </div>

            {/* 6. Gasto com combustível por km */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Combustível por Km
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Fuel className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {formatFuelCostPerKm(periodSummary.averageFuelCostPerKm)}
              </div>
              <p className="text-xs text-slate-400">
                Custo direto de combustível para cada quilômetro rodado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: HISTÓRICO */}
      {activeSubTab === 'history' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Controls Bar: Month Picker & Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Filtrar Mês:
              </label>
              <select
                value={historyMonth}
                onChange={(e) => {
                  setHistoryMonth(Number(e.target.value));
                  setSearchDateQuery('');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 focus:outline-none"
              >
                {MONTH_NAMES_BR.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={historyYear}
                onChange={(e) => {
                  setHistoryYear(Number(e.target.value));
                  setSearchDateQuery('');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 focus:outline-none"
              >
                {[historyYear - 1, historyYear, historyYear + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick date search */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por data (DD/MM)..."
                value={searchDateQuery}
                onChange={(e) => setSearchDateQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Period Summary Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Dias Registrados
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">
                {periodSummary.totalDaysWorked} <span className="text-xs font-normal text-slate-400">dias</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Km Rodados
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5 font-mono">
                {periodSummary.totalKm.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                <span className="text-xs font-normal text-slate-400">km</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Faturamento Bruto
              </span>
              <div className="text-xl sm:text-2xl font-black text-teal-400 mt-0.5 font-mono">
                {formatCurrency(periodSummary.totalGross)}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Valor após Combustível
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 font-mono">
                {formatCurrency(periodSummary.totalValueAfterFuel)}
              </div>
            </div>
          </div>

          {/* List of Entries */}
          {filteredHistoryEntries.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 space-y-2">
              <Car className="w-8 h-8 mx-auto text-slate-500 opacity-50" />
              <p className="text-sm font-semibold">Nenhum registro encontrado para este período.</p>
              <button
                type="button"
                onClick={() => setActiveSubTab('register')}
                className="mt-2 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Registrar Primeiro Dia</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistoryEntries.map((entry) => {
                const metrics = calculateRideMetrics(entry);
                const platformLabel =
                  entry.platform === 'uber' ? 'Uber' : entry.platform === '99' ? '99' : 'Uber + 99';

                return (
                  <div
                    key={entry.id}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md space-y-3"
                  >
                    {/* Top Row: Date & Platform & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base sm:text-lg font-extrabold text-slate-100">
                          {formatDateBR(entry.date)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30">
                          {platformLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleLoadEntryIntoForm(entry)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Editar registro"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmState({ isOpen: true, date: entry.date })}
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                          title="Excluir registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Faturamento</span>
                        <span className="font-extrabold text-teal-400 text-sm font-mono mt-0.5 block">
                          {formatCurrency(entry.grossEarnings)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Combustível</span>
                        <span className="font-extrabold text-amber-400 text-sm font-mono mt-0.5 block">
                          {formatCurrency(entry.fuelExpenses)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Após Combustível</span>
                        <span className="font-extrabold text-emerald-400 text-sm font-mono mt-0.5 block">
                          {formatValueAfterFuel(metrics.valueAfterFuel)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Horas Dirigidas</span>
                        <span className="font-extrabold text-slate-100 text-sm mt-0.5 block">
                          {formatDurationHoursMinutes(entry.hoursDriven)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Ganhos / Hora</span>
                        <span className="font-extrabold text-teal-400 text-sm font-mono mt-0.5 block">
                          {formatGrossPerHour(metrics.grossPerHour)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Km / Viagens</span>
                        <span className="font-extrabold text-slate-100 text-sm font-mono mt-0.5 block">
                          {entry.kmDriven} km / {entry.totalRides} c.
                        </span>
                      </div>
                    </div>

                    {/* Notes if any */}
                    {entry.notes && (
                      <div className="text-xs text-slate-400 italic pt-1">
                        Nota: "{entry.notes}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">
                    Resolver Conflito de Sincronização
                  </h3>
                  <p className="text-xs text-slate-400">
                    Dia {formatDateBR(selectedConflict.rideDate)} — Versões divergentes encontradas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConflict(null)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Identificamos que este dia possui valores diferentes neste dispositivo e na nuvem. Nenhuma informação foi apagada. Escolha qual versão deseja manter:
            </p>

            {/* Side by side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Column */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                    Deste Dispositivo (Local)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(selectedConflict.localEntry.updatedAt).toLocaleTimeString('pt-BR')}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('grossEarnings') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Ganhos Brutos:</span>
                    <span className="font-mono">{formatCurrency(selectedConflict.localEntry.grossEarnings)}</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('hoursDriven') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Horas Trabalhadas:</span>
                    <span>{formatDurationHoursMinutes(selectedConflict.localEntry.hoursDriven)}</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('kmDriven') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Km Rodados:</span>
                    <span className="font-mono">{selectedConflict.localEntry.kmDriven} km</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('totalRides') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Viagens:</span>
                    <span className="font-mono">{selectedConflict.localEntry.totalRides}</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('fuelExpenses') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Combustível:</span>
                    <span className="font-mono">{formatCurrency(selectedConflict.localEntry.fuelExpenses)}</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('platform') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Plataforma:</span>
                    <span className="capitalize">{selectedConflict.localEntry.platform}</span>
                  </div>
                  {selectedConflict.localEntry.notes && (
                    <div className="pt-1 text-[11px] text-slate-400 italic">
                      Nota: "{selectedConflict.localEntry.notes}"
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isResolvingConflict}
                  onClick={() => handleResolveConflictDecision(selectedConflict.id, 'keep_local')}
                  className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isResolvingConflict ? 'Salvando...' : 'Manter Versão Deste Dispositivo'}
                </button>
              </div>

              {/* Cloud Column */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Versão na Nuvem
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(selectedConflict.cloudEntry.updatedAt).toLocaleTimeString('pt-BR')}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('grossEarnings') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Ganhos Brutos:</span>
                    <span className="font-mono">{formatCurrency(selectedConflict.cloudEntry.grossEarnings)}</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('hoursDriven') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Horas Trabalhadas:</span>
                    <span>{formatDurationHoursMinutes(selectedConflict.cloudEntry.hoursDriven)}</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('kmDriven') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Km Rodados:</span>
                    <span className="font-mono">{selectedConflict.cloudEntry.kmDriven} km</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('totalRides') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Viagens:</span>
                    <span className="font-mono">{selectedConflict.cloudEntry.totalRides}</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('fuelExpenses') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Combustível:</span>
                    <span className="font-mono">{formatCurrency(selectedConflict.cloudEntry.fuelExpenses)}</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b border-slate-850 ${selectedConflict.divergentFields.includes('platform') ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    <span>Plataforma:</span>
                    <span className="capitalize">{selectedConflict.cloudEntry.platform}</span>
                  </div>
                  {selectedConflict.cloudEntry.notes && (
                    <div className="pt-1 text-[11px] text-slate-400 italic">
                      Nota: "{selectedConflict.cloudEntry.notes}"
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isResolvingConflict}
                  onClick={() => handleResolveConflictDecision(selectedConflict.id, 'keep_cloud')}
                  className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isResolvingConflict ? 'Salvando...' : 'Manter Versão da Nuvem'}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedConflict(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Decidir Depois
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Snapshot Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">
                    Restaurar Snapshot Local
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecione um ponto de restauração gravado no navegador
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {availableBackups.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Nenhum snapshot preventivo encontrado neste navegador.
                </p>
              ) : (
                availableBackups.map((b) => (
                  <div
                    key={b.backupKey}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        {new Date(b.timestamp).toLocaleString('pt-BR')}
                      </div>
                      <div className="text-[11px] text-teal-400 mt-0.5">
                        {b.count} registro(s) arquivado(s)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreFromSnapshot(b.backupKey)}
                      className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      Restaurar
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        title="Excluir Registro de Corridas"
        message={`Tem certeza de que deseja excluir o registro do dia ${formatDateBR(deleteConfirmState.date)}? Essa ação não poderá ser desfeita.`}
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={async () => {
          await onDeleteLog(deleteConfirmState.date);
          setDeleteConfirmState({ isOpen: false, date: '' });
        }}
        onCancel={() => setDeleteConfirmState({ isOpen: false, date: '' })}
      />
    </div>
  );
};

