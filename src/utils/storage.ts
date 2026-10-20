import { Bill, WorkSchedule, DailyClosure } from '../types';
import { getTodayStr } from './formatters';

const STORAGE_KEYS = {
  BILLS: 'motoristapro_bills_v1',
  SCHEDULE: 'motoristapro_schedule_v1',
  CLOSURES: 'motoristapro_closures_v1',
  ONBOARDING_DONE: 'motoristapro_onboarding_v1',
};

// Initial sample data based directly on user prompt:
// Aluguel 1.000,00 dia 25, Luz 350.00 dia 20, Agua 150.00 dia 10
// Days off: Quarta-feira (3), Sábado (6), Domingo (0)
export const INITIAL_BILLS: Bill[] = [
  {
    id: 'bill-1',
    description: 'Aluguel',
    amount: 1000.00,
    dueDay: 25,
    isRecurring: true,
    initialAccumulated: 0,
    category: 'moradia',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bill-2',
    description: 'Energia Elétrica (Luz)',
    amount: 350.00,
    dueDay: 20,
    isRecurring: true,
    initialAccumulated: 0,
    category: 'utilidades',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bill-3',
    description: 'Conta de Água',
    amount: 150.00,
    dueDay: 10,
    isRecurring: true,
    initialAccumulated: 0,
    category: 'utilidades',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_SCHEDULE: WorkSchedule = {
  // Quarta-feira (3), Sábado (6), Domingo (0)
  offWeekdays: [0, 3, 6],
  customDayOverrides: {},
};

export function loadBills(): Bill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BILLS);
    if (raw === null) return INITIAL_BILLS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_BILLS;
  } catch (err) {
    console.error('Error loading bills:', err);
    return INITIAL_BILLS;
  }
}

export function saveBills(bills: Bill[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  } catch (err) {
    console.error('Error saving bills:', err);
  }
}

export function loadSchedule(): WorkSchedule {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    if (!raw) return INITIAL_SCHEDULE;
    const parsed = JSON.parse(raw);
    return {
      offWeekdays: Array.isArray(parsed.offWeekdays) ? parsed.offWeekdays : INITIAL_SCHEDULE.offWeekdays,
      customDayOverrides: parsed.customDayOverrides || {},
    };
  } catch (err) {
    console.error('Error loading schedule:', err);
    return INITIAL_SCHEDULE;
  }
}

export function saveSchedule(schedule: WorkSchedule): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
  } catch (err) {
    console.error('Error saving schedule:', err);
  }
}

export function loadClosures(): Record<string, DailyClosure> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLOSURES);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (err) {
    console.error('Error loading closures:', err);
    return {};
  }
}

export function saveClosures(closures: Record<string, DailyClosure>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLOSURES, JSON.stringify(closures));
  } catch (err) {
    console.error('Error saving closures:', err);
  }
}

export function loadOnboardingStatus(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingDone(done: boolean = true): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, done ? 'true' : 'false');
  } catch (err) {
    console.error('Error setting onboarding status:', err);
  }
}

export function resetAllData(): { bills: Bill[]; schedule: WorkSchedule; closures: Record<string, DailyClosure> } {
  try {
    localStorage.removeItem(STORAGE_KEYS.BILLS);
    localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
    localStorage.removeItem(STORAGE_KEYS.CLOSURES);
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_DONE);
  } catch (e) {
    console.error(e);
  }
  return {
    bills: INITIAL_BILLS,
    schedule: INITIAL_SCHEDULE,
    closures: {},
  };
}

export function resetToBlank(): { bills: Bill[]; schedule: WorkSchedule; closures: Record<string, DailyClosure> } {
  try {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CLOSURES, JSON.stringify({}));
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
  } catch (e) {
    console.error(e);
  }
  return {
    bills: [],
    schedule: loadSchedule(),
    closures: {},
  };
}

