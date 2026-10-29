import { RideLogEntry, RidePlatform, RideLogConflict, RideBackupSnapshot, RideCloudStatus } from '../types';
import { supabase } from './supabase';
import { generateUUID } from '../utils/formatters';

const STORAGE_KEY = 'motoristapro_rides_v1';
const BACKUP_INDEX_KEY = 'motoristapro_rides_backup_list_v1';
const CONFLICTS_KEY = 'motoristapro_rides_conflicts_v1';

// ============================================================================
// 1. GERENCIAMENTO DE CACHE LOCAL
// ============================================================================

/**
 * Carrega registros locais de corridas armazenados no navegador.
 * Armazenado como Record<string, RideLogEntry> indexado pela data (YYYY-MM-DD).
 */
export function loadLocalRideLogs(): Record<string, RideLogEntry> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.error('Erro ao carregar registros locais do diário de corridas:', err);
    return {};
  }
}

/**
 * Salva registros no cache local do navegador de forma defensiva.
 */
export function saveLocalRideLogs(logs: Record<string, RideLogEntry>): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Erro ao salvar registros locais do diário de corridas:', err);
  }
}

// ============================================================================
// 2. BACKUP PREVENTIVO E RESTAURAÇÃO
// ============================================================================

/**
 * Cria um snapshot de backup automático dos registros locais no localStorage.
 * Mantém o histórico dos últimos 5 backups para auditoria e recuperação rápida.
 */
export function backupLocalRideLogsBeforeSync(): RideBackupSnapshot | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const currentLogs = loadLocalRideLogs();
    const count = Object.keys(currentLogs).length;
    if (count === 0) return null;

    const nowIso = new Date().toISOString();
    const safeKeySuffix = nowIso.replace(/[:.]/g, '-');
    const backupKey = `motoristapro_rides_backup_${safeKeySuffix}`;

    // Salva o snapshot dos dados completos
    localStorage.setItem(backupKey, JSON.stringify(currentLogs));

    // Atualiza a lista de backups disponíveis
    const existingList = listRideBackups();
    const newEntry: RideBackupSnapshot = {
      backupKey,
      timestamp: nowIso,
      count,
    };

    const updatedList = [newEntry, ...existingList.filter((b) => b.backupKey !== backupKey)].slice(0, 5);
    localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(updatedList));

    return newEntry;
  } catch (err) {
    console.warn('Aviso: falha ao criar snapshot preventivo no localStorage:', err);
    return null;
  }
}

/**
 * Lista todos os snapshots de backup disponíveis localmente.
 */
export function listRideBackups(): RideBackupSnapshot[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BACKUP_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Restaura os registros do diário de corridas a partir de um snapshot selecionado.
 */
export function restoreRideLogsFromBackup(backupKey: string): {
  success: boolean;
  logs?: Record<string, RideLogEntry>;
  error?: string;
} {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { success: false, error: 'Ambiente sem localStorage' };
  }
  try {
    const raw = localStorage.getItem(backupKey);
    if (!raw) {
      return { success: false, error: 'Snapshot de backup não encontrado' };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Dados do backup inválidos ou corrompidos' };
    }

    // Salva no cache ativo
    saveLocalRideLogs(parsed);
    return { success: true, logs: parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao restaurar backup';
    return { success: false, error: msg };
  }
}

/**
 * Exporta os registros em arquivo JSON para download direto no navegador do motorista.
 */
export function exportRideLogsToJson(logs: Record<string, RideLogEntry>): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const dataStr = JSON.stringify(
      {
        modulo: 'MotoristaPro - Diário de Corridas',
        versao: '1.0',
        exportadoEm: new Date().toISOString(),
        totalRegistros: Object.keys(logs).length,
        registros: logs,
      },
      null,
      2
    );

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `motoristapro_diario_corridas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Erro ao exportar registros para JSON:', err);
  }
}

// ============================================================================
// 3. DETECÇÃO E RESOLUÇÃO DE CONFLITOS DE SINCRONIZAÇÃO
// ============================================================================

/**
 * Carrega a lista de conflitos pendentes de resolução.
 */
export function loadRideConflicts(): Record<string, RideLogConflict> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CONFLICTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Salva a lista de conflitos pendentes.
 */
export function saveRideConflicts(conflicts: Record<string, RideLogConflict>): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
  } catch (err) {
    console.error('Erro ao salvar conflitos:', err);
  }
}

/**
 * Compara dois registros da mesma data e verifica se existe divergência real de dados.
 */
export function detectConflictBetweenEntries(
  local: RideLogEntry,
  cloud: RideLogEntry
): { hasConflict: boolean; divergentFields: string[] } {
  const divergentFields: string[] = [];

  if (local.platform !== cloud.platform) divergentFields.push('platform');
  if (Math.abs(local.kmDriven - cloud.kmDriven) > 0.01) divergentFields.push('kmDriven');
  if (Math.abs(local.hoursDriven - cloud.hoursDriven) > 0.01) divergentFields.push('hoursDriven');
  if (local.totalRides !== cloud.totalRides) divergentFields.push('totalRides');
  if (Math.abs(local.grossEarnings - cloud.grossEarnings) > 0.01) divergentFields.push('grossEarnings');
  if (Math.abs(local.fuelExpenses - cloud.fuelExpenses) > 0.01) divergentFields.push('fuelExpenses');

  const localNotes = (local.notes || '').trim();
  const cloudNotes = (cloud.notes || '').trim();
  if (localNotes !== cloudNotes) divergentFields.push('notes');

  return {
    hasConflict: divergentFields.length > 0,
    divergentFields,
  };
}

/**
 * Resolve um conflito existente permitindo ao motorista escolher qual versão manter.
 */
export async function resolveRideConflict(
  conflictId: string,
  decision: 'keep_local' | 'keep_cloud',
  currentLogs: Record<string, RideLogEntry>,
  userId?: string
): Promise<{ success: boolean; updatedLogs: Record<string, RideLogEntry>; error?: string }> {
  const conflicts = loadRideConflicts();
  const conflict = conflicts[conflictId];
  if (!conflict) {
    return { success: false, updatedLogs: currentLogs, error: 'Conflito não encontrado' };
  }

  const { rideDate, localEntry, cloudEntry } = conflict;
  let finalEntry: RideLogEntry;

  if (decision === 'keep_local') {
    finalEntry = {
      ...localEntry,
      updatedAt: new Date().toISOString(),
    };
    // Atualiza na nuvem
    if (supabase && userId) {
      await supabase.from('ride_logs').upsert(
        {
          id: finalEntry.id,
          user_id: userId,
          ride_date: finalEntry.date,
          platform: finalEntry.platform,
          km_driven: finalEntry.kmDriven,
          hours_driven: finalEntry.hoursDriven,
          total_rides: finalEntry.totalRides,
          gross_earnings: finalEntry.grossEarnings,
          fuel_expenses: finalEntry.fuelExpenses,
          notes: finalEntry.notes || null,
          updated_at: finalEntry.updatedAt,
        },
        { onConflict: 'user_id,ride_date' }
      );
    }
  } else {
    finalEntry = { ...cloudEntry };
  }

  // Remove o conflito resolvido
  delete conflicts[conflictId];
  saveRideConflicts(conflicts);

  // Atualiza logs locais
  const updated = {
    ...currentLogs,
    [rideDate]: finalEntry,
  };
  saveLocalRideLogs(updated);

  return { success: true, updatedLogs: updated };
}

// ============================================================================
// 4. CARREGAMENTO E SINCRONIZAÇÃO DEFENSIVA
// ============================================================================

/**
 * Carrega registros de corridas: da nuvem Supabase se autenticado, com fallback para o cache local.
 * Implementa verificação preventiva, reconciliação bidirecional e detecção de conflitos.
 */
export async function loadRideLogs(userId?: string): Promise<{
  logs: Record<string, RideLogEntry>;
  cloudAvailable: boolean;
  cloudStatus: RideCloudStatus;
  cloudError?: string;
  conflictsCount: number;
}> {
  const localLogs = loadLocalRideLogs();
  const existingConflicts = loadRideConflicts();
  const conflictsCount = Object.keys(existingConflicts).length;

  if (!supabase || !userId) {
    return {
      logs: localLogs,
      cloudAvailable: false,
      cloudStatus: 'local_only',
      conflictsCount,
    };
  }

  try {
    // Faz a consulta padronizada usando os nomes exatos das colunas SQL
    const { data, error } = await supabase
      .from('ride_logs')
      .select(
        'id, user_id, ride_date, platform, km_driven, hours_driven, total_rides, gross_earnings, fuel_expenses, notes, created_at, updated_at'
      )
      .eq('user_id', userId)
      .order('ride_date', { ascending: false });

    if (error) {
      // Caso 1: Tabela ride_logs ainda não foi criada no Supabase
      if (
        error.code === '42P01' ||
        error.message.includes('relation "public.ride_logs" does not exist') ||
        error.message.includes('schema cache')
      ) {
        return {
          logs: localLogs,
          cloudAvailable: false,
          cloudStatus: 'table_not_found',
          cloudError: 'Tabela ride_logs não encontrada no Supabase. Os registros continuam salvos com segurança neste dispositivo.',
          conflictsCount,
        };
      }

      // Caso 2: Falha de autenticação ou permissão RLS
      if (error.code === '42501' || error.message.includes('permission denied')) {
        return {
          logs: localLogs,
          cloudAvailable: false,
          cloudStatus: 'error',
          cloudError: 'Permissão negada (RLS) no Supabase para a tabela ride_logs.',
          conflictsCount,
        };
      }

      throw error;
    }

    // Mapeia linhas da nuvem para o formato tipado RideLogEntry
    const cloudLogs: Record<string, RideLogEntry> = {};
    (data || []).forEach((row) => {
      cloudLogs[row.ride_date] = {
        id: row.id,
        date: row.ride_date,
        platform: (['uber', '99', 'ambas'].includes(row.platform) ? row.platform : 'ambas') as RidePlatform,
        kmDriven: Number(row.km_driven) || 0,
        hoursDriven: Number(row.hours_driven) || 0,
        totalRides: Number(row.total_rides) || 0,
        grossEarnings: Number(row.gross_earnings) || 0,
        fuelExpenses: Number(row.fuel_expenses) || 0,
        notes: row.notes || undefined,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
      };
    });

    // Se a nuvem retornou registros vazios e há dados no cache local:
    // NUNCA apaga os dados locais! Preserva o cache local original.
    if ((!data || data.length === 0) && Object.keys(localLogs).length > 0) {
      return {
        logs: localLogs,
        cloudAvailable: true,
        cloudStatus: 'synced',
        conflictsCount,
      };
    }

    // Reconciliação bidirecional inteligente e detecção de conflitos
    const mergedLogs: Record<string, RideLogEntry> = { ...localLogs };
    const pendingConflicts: Record<string, RideLogConflict> = { ...existingConflicts };

    Object.values(cloudLogs).forEach((cloudEntry) => {
      const localEntry = localLogs[cloudEntry.date];
      if (!localEntry) {
        // Registro existe na nuvem mas não no dispositivo: adota da nuvem
        mergedLogs[cloudEntry.date] = cloudEntry;
      } else {
        // Registro existe em ambos: checa se há divergência
        const { hasConflict, divergentFields } = detectConflictBetweenEntries(localEntry, cloudEntry);
        if (hasConflict) {
          const localTime = new Date(localEntry.updatedAt).getTime();
          const cloudTime = new Date(cloudEntry.updatedAt).getTime();
          const timeDiff = Math.abs(localTime - cloudTime);

          // Se a diferença de horário for menor que 5 minutos ou se os dados divergirem sem um claro vencedor:
          // Registra o conflito para decisão do motorista em vez de sobrescrever
          if (timeDiff < 300000 || localTime === cloudTime) {
            const conflictId = `conflict_${cloudEntry.date}`;
            pendingConflicts[conflictId] = {
              id: conflictId,
              rideDate: cloudEntry.date,
              detectedAt: new Date().toISOString(),
              localEntry,
              cloudEntry,
              divergentFields,
            };
          } else if (cloudTime > localTime) {
            // Nuvem é comprovadamente mais recente
            mergedLogs[cloudEntry.date] = cloudEntry;
          }
          // Se localTime > cloudTime, mantém localEntry para posterior upload
        } else {
          // Conteúdo idêntico: adota o registro alinhado
          mergedLogs[cloudEntry.date] = cloudEntry;
        }
      }
    });

    saveRideConflicts(pendingConflicts);
    saveLocalRideLogs(mergedLogs);

    const updatedConflictsCount = Object.keys(pendingConflicts).length;

    return {
      logs: mergedLogs,
      cloudAvailable: true,
      cloudStatus: updatedConflictsCount > 0 ? 'conflict' : 'synced',
      conflictsCount: updatedConflictsCount,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha ao sincronizar registros com o Supabase';
    console.warn('Fallback para cache local do diário de corridas:', errorMsg);
    return {
      logs: localLogs,
      cloudAvailable: false,
      cloudStatus: 'offline',
      cloudError: errorMsg,
      conflictsCount,
    };
  }
}

// ============================================================================
// 5. SALVAMENTO E EXCLUSÃO IDEMPOTENTE
// ============================================================================

/**
 * Salva ou atualiza um registro de corrida diário.
 * Garante unicidade por data (sobrescreve o registro da mesma data, sem duplicatas ou acúmulo indesejado).
 */
export async function syncSaveRideLog(
  entry: Omit<RideLogEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  currentLogs: Record<string, RideLogEntry>,
  userId?: string
): Promise<{ success: boolean; log: RideLogEntry; error?: string }> {
  const existing = currentLogs[entry.date];
  const now = new Date().toISOString();

  const finalLog: RideLogEntry = {
    id: existing?.id || entry.id || generateUUID(),
    date: entry.date,
    platform: entry.platform,
    kmDriven: Number(entry.kmDriven) || 0,
    hoursDriven: Number(entry.hoursDriven) || 0,
    totalRides: Number(entry.totalRides) || 0,
    grossEarnings: Number(entry.grossEarnings) || 0,
    fuelExpenses: Number(entry.fuelExpenses) || 0,
    notes: entry.notes?.trim() || undefined,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  // 1. Salva no cache local de forma síncrona imediata
  const updatedLogs = {
    ...currentLogs,
    [finalLog.date]: finalLog,
  };
  saveLocalRideLogs(updatedLogs);

  // 2. Se autenticado, sincroniza com o Supabase com upsert e onConflict por data
  if (supabase && userId) {
    try {
      const { error } = await supabase.from('ride_logs').upsert(
        {
          id: finalLog.id,
          user_id: userId,
          ride_date: finalLog.date,
          platform: finalLog.platform,
          km_driven: finalLog.kmDriven,
          hours_driven: finalLog.hoursDriven,
          total_rides: finalLog.totalRides,
          gross_earnings: finalLog.grossEarnings,
          fuel_expenses: finalLog.fuelExpenses,
          notes: finalLog.notes || null,
          updated_at: finalLog.updatedAt,
        },
        { onConflict: 'user_id,ride_date' }
      );

      if (error) {
        console.warn('Aviso: erro ao salvar registro na nuvem (mantido localmente):', error.message);
        return { success: true, log: finalLog, error: error.message };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar na nuvem';
      console.warn('Aviso: falha na conexão ao salvar corrida no Supabase (mantido localmente):', msg);
      return { success: true, log: finalLog, error: msg };
    }
  }

  return { success: true, log: finalLog };
}

/**
 * Remove um registro de corrida do cache local e da nuvem.
 */
export async function syncDeleteRideLog(
  dateStr: string,
  currentLogs: Record<string, RideLogEntry>,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const updated = { ...currentLogs };
  delete updated[dateStr];
  saveLocalRideLogs(updated);

  if (supabase && userId) {
    try {
      const { error } = await supabase
        .from('ride_logs')
        .delete()
        .eq('user_id', userId)
        .eq('ride_date', dateStr);

      if (error) {
        console.warn('Aviso: erro ao excluir registro no Supabase:', error.message);
        return { success: true, error: error.message };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir na nuvem';
      console.warn('Aviso: falha ao excluir no Supabase:', msg);
      return { success: true, error: msg };
    }
  }

  return { success: true };
}
