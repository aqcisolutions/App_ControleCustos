import { RideLogEntry, RidePerformanceMetrics } from '../types';
import { formatCurrency } from './formatters';

/**
 * Converte Horas e Minutos para formato decimal.
 * Exemplo: 8 horas e 30 minutos = 8.5 horas.
 */
export function hoursAndMinutesToDecimal(hours: number, minutes: number): number {
  const safeHours = Math.max(0, isNaN(hours) ? 0 : hours);
  const safeMinutes = Math.max(0, Math.min(59, isNaN(minutes) ? 0 : minutes));
  const decimal = safeHours + safeMinutes / 60;
  return Number(decimal.toFixed(4));
}

/**
 * Converte horas decimais para Horas e Minutos inteiros.
 * Exemplo: 8.5 horas = { hours: 8, minutes: 30 }.
 */
export function decimalToHoursAndMinutes(decimalHours: number): { hours: number; minutes: number } {
  if (isNaN(decimalHours) || decimalHours <= 0) {
    return { hours: 0, minutes: 0 };
  }
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (minutes >= 60) {
    return { hours: hours + 1, minutes: 0 };
  }
  return { hours, minutes };
}

/**
 * Formata duração em texto amigável.
 * Exemplo: 8.5 horas -> "8h 30m"
 */
export function formatDurationHoursMinutes(decimalHours: number): string {
  if (isNaN(decimalHours) || decimalHours <= 0) return '—';
  const { hours, minutes } = decimalToHoursAndMinutes(decimalHours);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/**
 * Calcula com segurança as 6 métricas de desempenho consolidadas.
 * Retorna null para qualquer métrica onde os dados sejam insuficientes ou divisão por zero ocorra.
 */
export function calculateRideMetrics(
  entry: Partial<Pick<RideLogEntry, 'grossEarnings' | 'fuelExpenses' | 'hoursDriven' | 'kmDriven' | 'totalRides'>>
): RidePerformanceMetrics {
  const gross = Number(entry.grossEarnings) || 0;
  const fuel = Number(entry.fuelExpenses) || 0;
  const hours = Number(entry.hoursDriven) || 0;
  const km = Number(entry.kmDriven) || 0;
  const rides = Number(entry.totalRides) || 0;

  // 1. Ganhos brutos por hora
  const grossPerHour = hours > 0 && gross > 0 ? gross / hours : null;

  // 2. Valor médio por corrida
  const averagePerRide = rides > 0 && gross > 0 ? gross / rides : null;

  // 3. Faturamento bruto por quilômetro
  const grossPerKm = km > 0 && gross > 0 ? gross / km : null;

  // 4. Corridas por hora
  const ridesPerHour = hours > 0 && rides > 0 ? rides / hours : null;

  // 5. Valor após combustível (Faturamento bruto menos combustível)
  // Retorna null somente se ambos forem 0 ou não informados
  const valueAfterFuel = gross > 0 || fuel > 0 ? gross - fuel : null;

  // 6. Gasto com combustível por quilômetro
  const fuelCostPerKm = km > 0 ? fuel / km : null;

  return {
    grossPerHour,
    averagePerRide,
    grossPerKm,
    ridesPerHour,
    valueAfterFuel,
    fuelCostPerKm,
  };
}

/**
 * Formatadores seguros que retornam "—" quando o valor for nulo, indefinido ou inválido.
 */
export function formatGrossPerHour(val: number | null): string {
  if (val === null || isNaN(val) || !isFinite(val)) return '—';
  return `${formatCurrency(val)}/h`;
}

export function formatAveragePerRide(val: number | null): string {
  if (val === null || isNaN(val) || !isFinite(val)) return '—';
  return `${formatCurrency(val)}/corrida`;
}

export function formatGrossPerKm(val: number | null): string {
  if (val === null || isNaN(val) || !isFinite(val)) return '—';
  return `${formatCurrency(val)}/km`;
}

export function formatRidesPerHour(val: number | null): string {
  if (val === null || isNaN(val) || !isFinite(val)) return '—';
  return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/h`;
}

export function formatValueAfterFuel(val: number | null): string {
  if (val === null || isNaN(val) || !isFinite(val)) return '—';
  return formatCurrency(val);
}

export function formatFuelCostPerKm(val: number | null): string {
  if (val === null || isNaN(val) || !isFinite(val)) return '—';
  return `${formatCurrency(val)}/km`;
}

/**
 * Consolida o resumo de um conjunto de dias (ex: mês selecionado).
 */
export function calculatePeriodSummary(entries: RideLogEntry[]): {
  totalDaysWorked: number;
  totalKm: number;
  totalHours: number;
  totalRides: number;
  totalGross: number;
  totalFuel: number;
  totalValueAfterFuel: number;
  averageGrossPerHour: number | null;
  averageGrossPerKm: number | null;
  averageFuelCostPerKm: number | null;
} {
  const totalDaysWorked = entries.length;
  const totalKm = entries.reduce((s, e) => s + (Number(e.kmDriven) || 0), 0);
  const totalHours = entries.reduce((s, e) => s + (Number(e.hoursDriven) || 0), 0);
  const totalRides = entries.reduce((s, e) => s + (Number(e.totalRides) || 0), 0);
  const totalGross = entries.reduce((s, e) => s + (Number(e.grossEarnings) || 0), 0);
  const totalFuel = entries.reduce((s, e) => s + (Number(e.fuelExpenses) || 0), 0);
  const totalValueAfterFuel = totalGross - totalFuel;

  return {
    totalDaysWorked,
    totalKm,
    totalHours,
    totalRides,
    totalGross,
    totalFuel,
    totalValueAfterFuel,
    averageGrossPerHour: totalHours > 0 && totalGross > 0 ? totalGross / totalHours : null,
    averageGrossPerKm: totalKm > 0 && totalGross > 0 ? totalGross / totalKm : null,
    averageFuelCostPerKm: totalKm > 0 ? totalFuel / totalKm : null,
  };
}
