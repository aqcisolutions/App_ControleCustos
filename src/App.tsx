/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { CalendarView } from './components/CalendarView';
import { DailyClosureView } from './components/DailyClosureView';
import { VaultOverview } from './components/VaultOverview';
import { SettingsView } from './components/SettingsView';
import { SetupWizard } from './components/SetupWizard';
import { ResetMonthModal } from './components/ResetMonthModal';
import { Bill, WorkSchedule, DailyClosure } from './types';
import {
  loadBills,
  saveBills,
  loadSchedule,
  saveSchedule,
  loadClosures,
  saveClosures,
  loadOnboardingStatus,
  setOnboardingDone,
  resetAllData,
  resetToBlank,
} from './utils/storage';
import { getTodayStr } from './utils/formatters';
import { calculateDaySchedule, calculateAllBillsProgress } from './utils/calculator';
import { Calendar, CheckSquare, PiggyBank, Settings, Sparkles, RotateCcw } from 'lucide-react';

export default function App() {
  const [bills, setBills] = useState<Bill[]>(() => loadBills());
  const [schedule, setSchedule] = useState<WorkSchedule>(() => loadSchedule());
  const [closures, setClosures] = useState<Record<string, DailyClosure>>(() => loadClosures());
  const [activeTab, setActiveTab] = useState<'calendar' | 'closure' | 'vault' | 'settings'>('calendar');
  const [closureTargetDate, setClosureTargetDate] = useState<string>(getTodayStr());
  const [showWizard, setShowWizard] = useState<boolean>(() => !loadOnboardingStatus() && bills.length === 0);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // Sync to localStorage
  const updateBills = (newBills: Bill[]) => {
    setBills(newBills);
    saveBills(newBills);
  };

  const updateSchedule = (newSchedule: WorkSchedule) => {
    setSchedule(newSchedule);
    saveSchedule(newSchedule);
  };

  const updateClosures = (newClosure: DailyClosure) => {
    const updated = {
      ...closures,
      [newClosure.date]: newClosure,
    };
    setClosures(updated);
    saveClosures(updated);
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
    saveClosures(updated);
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
    setBills(defaults.bills);
    setSchedule(defaults.schedule);
    setClosures({});
  };

  // Reset EVERYTHING to start mid-month with existing accounts and accumulated amounts
  const handleResetAllBlank = () => {
    const blank = resetToBlank();
    setBills(blank.bills);
    setClosures({});
    setShowWizard(true); // Open wizard immediately for smooth entry!
  };

  // Clear closures only
  const handleClearClosures = () => {
    setClosures({});
    saveClosures({});
  };

  // Complete wizard
  const handleFinishWizard = (newBills: Bill[], newSchedule: WorkSchedule) => {
    updateBills(newBills);
    updateSchedule(newSchedule);
    setOnboardingDone(true);
    setShowWizard(false);
    setActiveTab('calendar');
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
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shadow-md"
                  >
                    Abrir Assistente
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Zerar / Ajustar Mês</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowWizard(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
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
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Global Reset Month Modal */}
      <ResetMonthModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onResetAllBlank={handleResetAllBlank}
        onResetOnlyClosures={handleClearClosures}
        onResetToDefaults={handleResetToDefaults}
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
