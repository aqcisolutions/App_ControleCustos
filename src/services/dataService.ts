import { Bill, WorkSchedule, DailyClosure, BillDailyStatus } from '../types';
import { supabase } from './supabase';
import { generateUUID } from '../utils/formatters';
import {
  loadBills as loadLocalBills,
  saveBills as saveLocalBills,
  loadSchedule as loadLocalSchedule,
  saveSchedule as saveLocalSchedule,
  loadClosures as loadLocalClosures,
  saveClosures as saveLocalClosures,
} from '../utils/storage';

export type SyncStatus = 'synced' | 'saving' | 'offline' | 'error' | 'local_only';

type StatusListener = (status: SyncStatus, errorMsg?: string) => void;
const listeners = new Set<StatusListener>();

let currentStatus: SyncStatus = 'local_only';
let lastErrorMessage: string | undefined;

export function subscribeSyncStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  listener(currentStatus, lastErrorMessage);
  return () => {
    listeners.delete(listener);
  };
}

function setStatus(status: SyncStatus, errorMsg?: string) {
  currentStatus = status;
  lastErrorMessage = errorMsg;
  listeners.forEach((l) => l(status, errorMsg));
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim() !== '') {
      return obj.message;
    }
    if (typeof obj.error_description === 'string' && obj.error_description.trim() !== '') {
      return obj.error_description;
    }
    if (typeof obj.details === 'string' && obj.details.trim() !== '') {
      return obj.details;
    }
  }
  return fallback;
}

/**
 * Checks whether the user already has data in Supabase (to avoid overwriting returning accounts)
 */
export async function checkCloudHasData(userId: string): Promise<boolean> {
  if (!supabase || !userId) return false;
  try {
    const [closuresRes, billsRes] = await Promise.all([
      supabase.from('daily_closures').select('closure_date', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('bills').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    const closuresCount = closuresRes.count || 0;
    const billsCount = billsRes.count || 0;
    return closuresCount > 0 || billsCount > 0;
  } catch (err) {
    console.warn('Could not verify cloud data presence:', err);
    return false;
  }
}

/**
 * Checks whether the user has un-migrated local data in the browser
 */
export function hasLocalDataToMigrate(): boolean {
  try {
    const rawClosures = localStorage.getItem('motoristapro_closures_v1');
    if (rawClosures) {
      const parsed = JSON.parse(rawClosures);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return true;
      }
    }

    const rawBills = localStorage.getItem('motoristapro_bills_v1');
    if (rawBills) {
      const parsed = JSON.parse(rawBills);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasCustom = parsed.some(
          (b: Bill) =>
            !['bill-1', 'bill-2', 'bill-3'].includes(b.id) ||
            (b.amount !== 1000 && b.amount !== 350 && b.amount !== 150)
        );
        const onboardingDone = localStorage.getItem('motoristapro_onboarding_v1') === 'true';
        if (hasCustom || onboardingDone) {
          return true;
        }
      }
    }
    return false;
  } catch (err) {
    console.error('Error checking local data to migrate:', err);
    return false;
  }
}

/**
 * Archives an immutable snapshot of local data before migration so nothing is ever lost
 */
export function archiveLocalDataBeforeMigration(snapshot?: {
  bills: Bill[];
  schedule: WorkSchedule;
  closures: Record<string, DailyClosure>;
}): void {
  try {
    const backupKey = `motoristapro_pre_cloud_backup_${new Date().toISOString()}`;
    const dataToSave = snapshot || {
      bills: loadLocalBills(),
      schedule: loadLocalSchedule(),
      closures: loadLocalClosures(),
    };
    localStorage.setItem(
      backupKey,
      JSON.stringify({
        ...dataToSave,
        archivedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    console.warn('Could not archive local data backup:', err);
  }
}

/**
 * Load full application data: from Supabase if user is authenticated, else from localStorage
 */
export async function loadAppData(userId?: string): Promise<{
  bills: Bill[];
  schedule: WorkSchedule;
  closures: Record<string, DailyClosure>;
}> {
  if (!supabase || !userId) {
    setStatus('local_only');
    return {
      bills: loadLocalBills(),
      schedule: loadLocalSchedule(),
      closures: loadLocalClosures(),
    };
  }

  try {
    setStatus('saving');

    // 1. Fetch user profile / schedule
    const { data: profileData, error: profileErr } = await supabase
      .from('user_profiles')
      .select('off_weekdays, custom_day_overrides')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) throw profileErr;

    const schedule: WorkSchedule = profileData
      ? {
          offWeekdays: Array.isArray(profileData.off_weekdays) ? profileData.off_weekdays : [0, 3, 6],
          customDayOverrides: profileData.custom_day_overrides || {},
        }
      : loadLocalSchedule();

    // 2. Fetch bills
    const { data: billsData, error: billsErr } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .order('due_day', { ascending: true });

    if (billsErr) throw billsErr;

    const bills: Bill[] = (billsData || []).map((b) => ({
      id: b.id,
      description: b.description,
      amount: Number(b.amount),
      dueDay: Number(b.due_day),
      category: b.category,
      isRecurring: b.is_recurring !== false,
      initialAccumulated: Number(b.initial_accumulated || 0),
      startDate: b.start_date || undefined,
      createdAt: b.created_at || new Date().toISOString(),
    }));

    // 3. Fetch closures
    const { data: closuresData, error: closuresErr } = await supabase
      .from('daily_closures')
      .select('*')
      .eq('user_id', userId);

    if (closuresErr) throw closuresErr;

    const closures: Record<string, DailyClosure> = {};
    (closuresData || []).forEach((c) => {
      closures[c.closure_date] = {
        date: c.closure_date,
        grossEarnings: Number(c.gross_earnings),
        fuelExpenses: c.fuel_expenses ? Number(c.fuel_expenses) : undefined,
        notes: c.notes || undefined,
        completed: c.completed !== false,
        billsStatus: c.bills_status || {},
        updatedAt: c.updated_at || new Date().toISOString(),
      };
    });

    // Cache locally as an offline backup
    saveLocalBills(bills);
    saveLocalSchedule(schedule);
    saveLocalClosures(closures);

    setStatus('synced');
    return { bills, schedule, closures };
  } catch (err: unknown) {
    const msg = extractErrorMessage(err, 'Erro ao carregar dados da nuvem');
    console.error('Error loading cloud data, falling back to local cache:', err);
    setStatus('error', msg);
    return {
      bills: loadLocalBills(),
      schedule: loadLocalSchedule(),
      closures: loadLocalClosures(),
    };
  }
}

/**
 * Persist bills
 */
export async function syncBills(bills: Bill[], userId?: string): Promise<Bill[]> {
  // Ensure all bills have valid UUIDs for PostgreSQL
  const billIdMap = new Map<string, string>();
  let hasNonUuid = false;

  const normalizedBills: Bill[] = bills.map((b) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id);
    if (isUuid) return b;
    const newUuid = generateUUID();
    billIdMap.set(b.id, newUuid);
    hasNonUuid = true;
    return { ...b, id: newUuid };
  });

  saveLocalBills(normalizedBills);

  if (hasNonUuid) {
    // Also remap any closures in localStorage that reference the old bill IDs
    const closures = loadLocalClosures();
    let closuresModified = false;
    for (const c of Object.values(closures)) {
      if (c.billsStatus) {
        for (const [oldId, newId] of billIdMap.entries()) {
          if (c.billsStatus[oldId]) {
            c.billsStatus[newId] = {
              ...c.billsStatus[oldId],
              billId: newId,
            };
            delete c.billsStatus[oldId];
            closuresModified = true;
          }
        }
      }
    }
    if (closuresModified) {
      saveLocalClosures(closures);
    }
  }

  if (!supabase || !userId) {
    setStatus('local_only');
    return normalizedBills;
  }

  try {
    setStatus('saving');
    // Get current cloud bills to detect deletions
    const { data: existing, error: fetchErr } = await supabase
      .from('bills')
      .select('id')
      .eq('user_id', userId);

    if (fetchErr) throw fetchErr;

    const existingIds = new Set((existing || []).map((b) => b.id));
    const currentIds = new Set(normalizedBills.map((b) => b.id));

    // Delete removed bills
    const toDelete = [...existingIds].filter((id) => !currentIds.has(id));
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('bills')
        .delete()
        .eq('user_id', userId)
        .in('id', toDelete);
      if (delErr) throw delErr;
    }

    // Upsert current bills
    if (normalizedBills.length > 0) {
      const rows = normalizedBills.map((b) => ({
        id: b.id,
        user_id: userId,
        description: b.description,
        amount: b.amount,
        due_day: b.dueDay,
        category: b.category || 'outros',
        is_recurring: b.isRecurring !== false,
        initial_accumulated: b.initialAccumulated || 0,
        start_date: b.startDate || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase.from('bills').upsert(rows);
      if (upsertErr) throw upsertErr;
    }

    setStatus('synced');
    return normalizedBills;
  } catch (err: unknown) {
    const msg = extractErrorMessage(err, 'Falha ao sincronizar contas');
    console.error('Error syncing bills:', err);
    setStatus('error', msg);
    return normalizedBills;
  }
}

/**
 * Persist schedule
 */
export async function syncSchedule(schedule: WorkSchedule, userId?: string): Promise<void> {
  saveLocalSchedule(schedule);

  if (!supabase || !userId) {
    setStatus('local_only');
    return;
  }

  try {
    setStatus('saving');
    const { error } = await supabase.from('user_profiles').upsert({
      id: userId,
      off_weekdays: schedule.offWeekdays,
      custom_day_overrides: schedule.customDayOverrides,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    setStatus('synced');
  } catch (err: unknown) {
    const msg = extractErrorMessage(err, 'Falha ao sincronizar agenda');
    console.error('Error syncing schedule:', err);
    setStatus('error', msg);
  }
}

/**
 * Persist closure for a single date
 */
export async function syncClosure(closure: DailyClosure, allClosures: Record<string, DailyClosure>, userId?: string): Promise<void> {
  saveLocalClosures(allClosures);

  if (!supabase || !userId) {
    setStatus('local_only');
    return;
  }

  try {
    setStatus('saving');
    const { error } = await supabase.from('daily_closures').upsert(
      {
        user_id: userId,
        closure_date: closure.date,
        gross_earnings: closure.grossEarnings,
        fuel_expenses: closure.fuelExpenses || 0,
        notes: closure.notes || null,
        completed: closure.completed !== false,
        bills_status: closure.billsStatus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,closure_date' }
    );

    if (error) throw error;
    setStatus('synced');
  } catch (err: unknown) {
    const msg = extractErrorMessage(err, 'Falha ao salvar fechamento');
    console.error('Error syncing closure:', err);
    setStatus('error', msg);
  }
}

/**
 * Delete a closure
 */
export async function syncDeleteClosure(dateStr: string, allClosures: Record<string, DailyClosure>, userId?: string): Promise<void> {
  saveLocalClosures(allClosures);

  if (!supabase || !userId) {
    setStatus('local_only');
    return;
  }

  try {
    setStatus('saving');
    const { error } = await supabase
      .from('daily_closures')
      .delete()
      .eq('user_id', userId)
      .eq('closure_date', dateStr);

    if (error) throw error;
    setStatus('synced');
  } catch (err: unknown) {
    const msg = extractErrorMessage(err, 'Falha ao excluir fechamento');
    console.error('Error deleting closure:', err);
    setStatus('error', msg);
  }
}

/**
 * Migrate local browser data into user's authenticated cloud account
 */
export async function migrateLocalToCloud(
  userId: string,
  localBills: Bill[],
  localSchedule: WorkSchedule,
  localClosures: Record<string, DailyClosure>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !userId) {
    return { success: false, error: 'Sessão de usuário não encontrada.' };
  }

  try {
    setStatus('saving');
    archiveLocalDataBeforeMigration({
      bills: localBills,
      schedule: localSchedule,
      closures: localClosures,
    });

    // 1. Save schedule / user profile
    const { error: schedErr } = await supabase.from('user_profiles').upsert({
      id: userId,
      off_weekdays: localSchedule.offWeekdays,
      custom_day_overrides: localSchedule.customDayOverrides,
      updated_at: new Date().toISOString(),
    });
    if (schedErr) throw schedErr;

    // 2. Map and insert bills
    const billIdMap = new Map<string, string>(); // oldId -> newUuid

    const billRows = localBills.map((b) => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id);
      const rowId = isUuid ? b.id : generateUUID();
      billIdMap.set(b.id, rowId);

      return {
        id: rowId,
        user_id: userId,
        description: b.description,
        amount: b.amount,
        due_day: b.dueDay,
        category: b.category || 'outros',
        is_recurring: b.isRecurring !== false,
        initial_accumulated: b.initialAccumulated || 0,
        start_date: b.startDate || null,
        updated_at: new Date().toISOString(),
      };
    });

    if (billRows.length > 0) {
      const { error: billErr } = await supabase.from('bills').upsert(billRows);
      if (billErr) throw billErr;
    }

    // 3. Remap and insert closures
    const closureRows = Object.values(localClosures).map((c) => {
      const remappedStatus: Record<string, BillDailyStatus> = {};
      if (c.billsStatus) {
        for (const [oldBId, st] of Object.entries(c.billsStatus)) {
          const finalId = billIdMap.get(oldBId) || oldBId;
          remappedStatus[finalId] = {
            ...st,
            billId: finalId,
          };
        }
      }

      return {
        user_id: userId,
        closure_date: c.date,
        gross_earnings: c.grossEarnings,
        fuel_expenses: c.fuelExpenses || 0,
        notes: c.notes || null,
        completed: c.completed !== false,
        bills_status: remappedStatus,
        updated_at: new Date().toISOString(),
      };
    });

    if (closureRows.length > 0) {
      const { error: cErr } = await supabase.from('daily_closures').upsert(
        closureRows,
        { onConflict: 'user_id,closure_date' }
      );
      if (cErr) throw cErr;
    }

    // 4. Update local cache with newly remapped UUIDs
    const remappedBills: Bill[] = localBills.map((b) => ({
      ...b,
      id: billIdMap.get(b.id) || b.id,
    }));

    const remappedClosures: Record<string, DailyClosure> = {};
    for (const [date, c] of Object.entries(localClosures)) {
      const remappedStatus: Record<string, BillDailyStatus> = {};
      if (c.billsStatus) {
        for (const [oldBId, st] of Object.entries(c.billsStatus)) {
          const finalId = billIdMap.get(oldBId) || oldBId;
          remappedStatus[finalId] = {
            ...st,
            billId: finalId,
          };
        }
      }
      remappedClosures[date] = {
        ...c,
        billsStatus: remappedStatus,
      };
    }

    saveLocalBills(remappedBills);
    saveLocalSchedule(localSchedule);
    saveLocalClosures(remappedClosures);

    setStatus('synced');
    return { success: true };
  } catch (err: unknown) {
    const msg = extractErrorMessage(err, 'Falha na migração dos dados');
    console.error('Migration error details:', err);
    setStatus('error', msg);
    return { success: false, error: msg };
  }
}
