export type BillCategory = 'carro' | 'moradia' | 'utilidades' | 'alimentacao' | 'outros';

export interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDay: number; // 1-31
  isRecurring?: boolean; // true = Se repete todo mês (recorrente); false = Não se repete (conta única/avulsa)
  initialAccumulated?: number; // Valor já acumulado/reservado previamente neste mês
  startDate?: string; // Data em que a conta foi informada / início dos lançamentos (YYYY-MM-DD)
  category?: BillCategory;
  createdAt: string;
}

export interface WorkSchedule {
  // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  offWeekdays: number[];
  // Custom overrides for specific dates ('YYYY-MM-DD'): true = work, false = rest/off
  customDayOverrides: Record<string, boolean>;
}

export interface BillDailyStatus {
  billId: string;
  targetAmount: number;
  saved: boolean; // true = SIM, false = NÃO
  actualAmount: number; // amount actually saved
}

export interface DailyClosure {
  date: string; // 'YYYY-MM-DD'
  grossEarnings: number;
  fuelExpenses?: number;
  billsStatus: Record<string, BillDailyStatus>;
  notes?: string;
  completed: boolean;
  updatedAt: string;
}

export interface BillReserveCalculation {
  bill: Bill;
  cycleStart: string; // YYYY-MM-DD
  cycleEnd: string; // YYYY-MM-DD
  totalAmount: number;
  alreadyReserved: number;
  remainingAmount: number;
  totalWorkDaysInCycle: number;
  remainingWorkDays: number;
  currentDailyTarget: number;
  periodDailyQuota: number; // quota calculated for working days in the period
  isFullyReserved: boolean;
  daysUntilDue: number;
  isBeforePeriod: boolean;
  isAfterPeriod?: boolean;
  daysUntilPeriodStart: number;
  isInitialCycle?: boolean;
}

export interface DayCalculation {
  date: string; // YYYY-MM-DD
  isWorkDay: boolean;
  isDueDayForBills: Bill[];
  billTargets: {
    billId: string;
    billDescription: string;
    targetAmount: number;
    dueDay: number;
    cycleStart?: string;
    cycleEnd?: string;
    savedStatus?: boolean; // if already registered in closure
    isInitialCycle?: boolean;
  }[];
  upcomingBills?: {
    bill: Bill;
    cycleStart: string;
    cycleEnd: string;
    daysUntilStart: number;
    dailyQuota: number;
  }[];
  totalDayTarget: number;
  hasClosure: boolean;
  closure?: DailyClosure;
}

// --- Diário de Corridas Types ---
export type RidePlatform = 'uber' | '99' | 'ambas';

export interface RideLogEntry {
  id: string;
  date: string; // 'YYYY-MM-DD' (único por dia)
  platform: RidePlatform;
  kmDriven: number;
  hoursDriven: number; // Armazenado em formato decimal (ex: 8.5 para 8h 30m)
  totalRides: number;
  grossEarnings: number;
  fuelExpenses: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RidePerformanceMetrics {
  grossPerHour: number | null;
  averagePerRide: number | null;
  grossPerKm: number | null;
  ridesPerHour: number | null;
  valueAfterFuel: number | null;
  fuelCostPerKm: number | null;
}

export interface RideLogConflict {
  id: string;
  rideDate: string;
  detectedAt: string;
  localEntry: RideLogEntry;
  cloudEntry: RideLogEntry;
  divergentFields: string[];
}

export interface RideBackupSnapshot {
  backupKey: string;
  timestamp: string;
  count: number;
}

export type RideCloudStatus =
  | 'synced'
  | 'table_not_found'
  | 'offline'
  | 'auth_required'
  | 'conflict'
  | 'local_only'
  | 'error';

