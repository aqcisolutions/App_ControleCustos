/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { CalendarView } from './components/CalendarView';
import { DailyClosureView } from './components/DailyClosureView';
import { VaultOverview } from './components/VaultOverview';
import { SettingsView } from './components/SettingsView';
import { SetupWizard } from './components/SetupWizard';
import { ResetMonthModal } from './components/ResetMonthModal';
import { AuthModal } from './components/AuthModal';
import { BackupModal } from './components/BackupModal';
import { MigrationModal } from './components/MigrationModal';
import { Bill, WorkSchedule, DailyClosure } from './types';
import {
  loadBills as loadLocalBills,
  loadSchedule as loadLocalSchedule,
  loadClosures as loadLocalClosures,
  loadOnboardingStatus,
  setOnboardingDone,
  resetAllData,
  resetToBlank,
} from './utils/storage';
import { getTodayStr } from './utils/formatters';
import { calculateDaySchedule, calculateAllBillsProgress } from './utils/calculator';
import { BackupData } from './utils/backupValidator';
import {
  SyncStatus,
  subscribeSyncStatus,
  loadAppData,
  syncBills,
  syncSchedule,
  syncClosure,
  syncDeleteClosure,
  migrateLocalToCloud,
  hasLocalDataToMigrate,
  checkCloudHasData,
  archiveLocalDataBeforeMigration,
} from './services/dataService';
import { supabase } from './services/supabase';
import { Calendar, CheckSquare, PiggyBank, Settings, Sparkles, RotateCcw } from 'lucide-react';

export default function App() {
  const [bills, setBills] = useState<Bill[]>(() => loadLocalBills());
  const [schedule, setSchedule] = useState<WorkSchedule>(() => loadLocalSchedule());
  const [closures, setClosures] = useState<Record<string, DailyClosure>>(() => loadLocalClosures());
  const [activeTab, setActiveTab] = useState<'calendar' | 'closure' | 'vault' | 'settings'>('calendar');
  const [closureTargetDate, setClosureTargetDate] = useState<string>(getTodayStr());
  const [showWizard, setShowWizard] = useState<boolean>(() => !loadOnboardingStatus() && bills.length === 0);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // Cloud & Auth State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local_only');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState<boolean>(false);

  // Migration & Concurrency protection
  const [pendingMigrationSnapshot, setPendingMigrationSnapshot] = useState<{
    bills: Bill[];
    schedule: WorkSchedule;
    closures: Record<string, DailyClosure>;
  } | null>(null);
  const isReloadingRef = useRef(false);
  const isMigrationPendingRef = useRef(false);

  // Subscribe to sync status
  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  // Fetch and sync data helper (guarded against concurrent reloads and pending migration)
  const reloadData = useCallback(async (currentUid?: string) => {
    if (isReloadingRef.current) return;
    if (isMigrationPendingRef.current) return;

    try {
      isReloadingRef.current = true;
      const data = await loadAppData(currentUid);
      setBills(data.bills);
      setSchedule(data.schedule);
      setClosures(data.closures);
    } finally {
      isReloadingRef.current = false;
    }
  }, []);

  // Supabase Auth Listener
  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    const handleAuthUser = async (user: { id: string; email?: string | null } | null) => {
      if (!isMounted) return;

      if (user) {
        const uid = user.id;
        setUserId(uid);
        setUserEmail(user.email || null);

        // Check if user already has data in Supabase (e.g. mobile or returning login)
        const cloudHasData = await checkCloudHasData(uid);
        if (!isMounted) return;

        if (cloudHasData) {
          // Returning cloud user: cloud is the source of truth
          isMigrationPendingRef.current = false;
          setIsMigrationModalOpen(false);
          setPendingMigrationSnapshot(null);
          await reloadData(uid);
        } else if (hasLocalDataToMigrate()) {
          // First-time cloud login with genuine local browser records:
          // Preserve an immutable copy of the local records!
          const snapshot = {
            bills: loadLocalBills(),
            schedule: loadLocalSchedule(),
            closures: loadLocalClosures(),
          };
          archiveLocalDataBeforeMigration(snapshot);
          setPendingMigrationSnapshot(snapshot);
          isMigrationPendingRef.current = true;
          setIsMigrationModalOpen(true);
          // CRITICAL: We DO NOT call reloadData(uid) here. Local data remains active.
        } else {
          // No cloud data and no local data to migrate
          isMigrationPendingRef.current = false;
          setIsMigrationModalOpen(false);
          setPendingMigrationSnapshot(null);
          await reloadData(uid);
        }
      } else {
        setUserId(null);
        setUserEmail(null);
        isMigrationPendingRef.current = false;
        setIsMigrationModalOpen(false);
        setPendingMigrationSnapshot(null);
        await reloadData();
      }
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleAuthUser(session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          await handleAuthUser(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        await handleAuthUser(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [reloadData]);

  // Sync on window focus / tab visibility change (prevent concurrent reloads and protect unconfirmed changes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        userId &&
        !isMigrationPendingRef.current &&
        !isReloadingRef.current
      ) {
        reloadData(userId);
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [userId, reloadData]);

  // Persist bills
  const updateBills = async (newBills: Bill[]) => {
    const normalized = await syncBills(newBills, userId || undefined);
    setBills(normalized);
  };

  // Persist schedule
  const updateSchedule = async (newSchedule: WorkSchedule) => {
    setSchedule(newSchedule);
    await syncSchedule(newSchedule, userId || undefined);
  };

  // Persist single daily closure
  const updateClosures = async (newClosure: DailyClosure) => {
    const updated = {
      ...closures,
      [newClosure.date]: newClosure,
    };
    setClosures(updated);
    await syncClosure(newClosure, updated, userId || undefined);
  };

  // Delete a specific bill across the entire app
  const handleDeleteBill = (billId: string) => {
    const updated = bills.filter((b) => b.id !== billId);
    updateBills(updated);
  };

  // Update a specific bill
  const handleUpdateBill = (updatedBill: Bill) => {
    const updated = bills.map((b) => (b.id === updatedBill.id ? updatedBill : b));
    updateBills(updated);
  };

  // Delete a specific day's closure
  const handleDeleteClosure = (dateStr: string) => {
    const updated = { ...closures };
    delete updated[dateStr];
    setClosures(updated);
    syncDeleteClosure(dateStr, updated, userId || undefined);
  };

  // Toggle single day override directly from calendar or day modal
  const handleToggleDayOverride = (dateStr: string, currentIsWorkDay: boolean) => {
    const newOverrides = {
      ...schedule.customDayOverrides,
      [dateStr]: !currentIsWorkDay,
    };
    const updatedSchedule: WorkSchedule = {
      ...schedule,
      customDayOverrides: newOverrides,
    };
    updateSchedule(updatedSchedule);
  };

  // Navigate to daily closure from calendar day click
  const handleOpenClosureForDay = (dateStr: string) => {
    setClosureTargetDate(dateStr);
    setActiveTab('closure');
  };

  // Reset to default sample driver data
  const handleResetToDefaults = () => {
    const defaults = resetAllData();
    updateBills(defaults.bills);
    updateSchedule(defaults.schedule);
    setClosures({});
    if (userId) {
      // Clear closures on cloud as well
      Object.keys(closures).forEach((d) => syncDeleteClosure(d, {}, userId));
    }
  };

  // Reset EVERYTHING to start mid-month with existing accounts and accumulated amounts
  const handleResetAllBlank = () => {
    const blank = resetToBlank();
    updateBills(blank.bills);
    setClosures({});
    if (userId) {
      Object.keys(closures).forEach((d) => syncDeleteClosure(d, {}, userId));
    }
    setShowWizard(true); // Open wizard immediately for smooth entry!
  };

  // Clear closures only
  const handleClearClosures = () => {
    setClosures({});
    if (userId) {
      Object.keys(closures).forEach((d) => syncDeleteClosure(d, {}, userId));
    }
  };

  // Complete wizard
  const handleFinishWizard = (newBills: Bill[], newSchedule: WorkSchedule) => {
    updateBills(newBills);
    updateSchedule(newSchedule);
    setOnboardingDone(true);
    setShowWizard(false);
    setActiveTab('calendar');
  };

  // Handle Logout
  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUserId(null);
    setUserEmail(null);
    await reloadData();
  };

  // Handle Migration Confirmation
  const handleConfirmMigration = async () => {
    if (!userId) return;
    const dataToMigrate = pendingMigrationSnapshot || {
      bills,
      schedule,
      closures,
    };
    const res = await migrateLocalToCloud(
      userId,
      dataToMigrate.bills,
      dataToMigrate.schedule,
      dataToMigrate.closures
    );
    if (res.success) {
      isMigrationPendingRef.current = false;
      setIsMigrationModalOpen(false);
      setPendingMigrationSnapshot(null);
      await reloadData(userId);
    } else {
      throw new Error(res.error || 'Erro durante a migração');
    }
  };

  // Handle Dismiss Migration (discard local data, use cloud data)
  const handleDismissMigration = async () => {
    isMigrationPendingRef.current = false;
    setIsMigrationModalOpen(false);
    setPendingMigrationSnapshot(null);
    if (userId) {
      await reloadData(userId);
    }
  };

  // Handle Backup Restore
  const handleRestoreBackup = async (backupData: BackupData) => {
    updateBills(backupData.bills);
    updateSchedule(backupData.schedule);
    setClosures(backupData.closures);

    if (userId) {
      for (const c of Object.values(backupData.closures)) {
        await syncClosure(c, backupData.closures, userId);
      }
    }
  };

  // Computed today's metrics
  const todayStr = getTodayStr();
  const todaySchedule = calculateDaySchedule(todayStr, bills, schedule, closures);
  const allBillsProgress = calculateAllBillsProgress(bills, schedule, closures);

  const totalMonthlyBills = bills.reduce((sum, b) => sum + b.amount, 0);
  const totalReserved = allBillsProgress.reduce((sum, b) => sum + b.alreadyReserved, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalMonthlyBills={totalMonthlyBills}
        totalReserved={totalReserved}
        todayTarget={todaySchedule.totalDayTarget}
        todayIsWorkDay={todaySchedule.isWorkDay}
        onOpenResetMonthModal={() => setIsResetModalOpen(true)}
        syncStatus={syncStatus}
        userEmail={userEmail}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenBackup={() => setIsBackupModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
        {/* Onboarding / Setup Wizard Mode */}
        {showWizard ? (
          <SetupWizard
            initialBills={bills}
            initialSchedule={schedule}
            onFinish={handleFinishWizard}
            onCancel={bills.length > 0 ? () => setShowWizard(false) : undefined}
          />
        ) : (
          <>
            {/* Quick banner if no bills registered yet */}
            {bills.length === 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs sm:text-sm text-amber-300">
                  <strong>Nenhuma conta cadastrada:</strong> Cadastre suas contas e informe quanto já guardou neste mês para calcular as diárias certas.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWizard(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shadow-md cursor-pointer"
                  >
                    Abrir Assistente
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer"
                  >
                    Carregar Exemplo
                  </button>
                </div>
              </div>
            )}

            {/* Active Tab View */}
            {activeTab === 'calendar' && (
              <CalendarView
                bills={bills}
                schedule={schedule}
                closures={closures}
                onToggleDayOverride={handleToggleDayOverride}
                onOpenClosureForDay={handleOpenClosureForDay}
                onDeleteClosure={handleDeleteClosure}
                onDeleteBill={handleDeleteBill}
              />
            )}

            {activeTab === 'closure' && (
              <DailyClosureView
                bills={bills}
                schedule={schedule}
                closures={closures}
                onSaveClosure={updateClosures}
                onDeleteClosure={handleDeleteClosure}
                initialDate={closureTargetDate}
                onOpenVault={() => setActiveTab('vault')}
              />
            )}

            {activeTab === 'vault' && (
              <VaultOverview
                bills={bills}
                schedule={schedule}
                closures={closures}
                onNavigateToClosure={() => setActiveTab('closure')}
                onNavigateToSettings={() => setActiveTab('settings')}
                onDeleteBill={handleDeleteBill}
                onUpdateBill={handleUpdateBill}
                onOpenResetMonthModal={() => setIsResetModalOpen(true)}
              />
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Zerar / Ajustar Mês</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowWizard(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Reabrir Assistente Passo a Passo</span>
                  </button>
                </div>

                <SettingsView
                  bills={bills}
                  schedule={schedule}
                  onSaveBills={updateBills}
                  onSaveSchedule={updateSchedule}
                  onResetToDefaults={handleResetToDefaults}
                  onResetAllBlank={handleResetAllBlank}
                  onClearClosures={handleClearClosures}
                  onOpenResetMonthModal={() => setIsResetModalOpen(true)}
                  onOpenBackup={() => setIsBackupModalOpen(true)}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Modais */}
      <ResetMonthModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onResetAllBlank={handleResetAllBlank}
        onResetOnlyClosures={handleClearClosures}
        onResetToDefaults={handleResetToDefaults}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(email) => {
          setUserEmail(email);
        }}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        bills={bills}
        schedule={schedule}
        closures={closures}
        onRestoreBackup={handleRestoreBackup}
      />

      <MigrationModal
        isOpen={isMigrationModalOpen}
        bills={pendingMigrationSnapshot?.bills || bills}
        closures={pendingMigrationSnapshot?.closures || closures}
        onConfirmMigration={handleConfirmMigration}
        onDismiss={handleDismissMigration}
      />

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => {
            setShowWizard(false);
            setActiveTab('calendar');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'calendar' && !showWizard
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Calendário</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowWizard(false);
            setActiveTab('closure');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'closure' && !showWizard
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Fechamento</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowWizard(false);
            setActiveTab('vault');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'vault' && !showWizard
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PiggyBank className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Cofre</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowWizard(false);
            setActiveTab('settings');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'settings' && !showWizard
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}
