import { format, startOfYear } from 'date-fns';

const TIMEZONE = 'Europe/Madrid';

export function getTodayLocal(): Date {
  return new Date();
}

export function getYTDRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = startOfYear(now);
  return { start, end: now };
}

export function formatDate(date: Date): string {
  return format(date, 'dd/MM/yyyy', { locale: undefined });
}

export function formatMoney(amount: number, currency: 'EUR' = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPct(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatDatetime(date: Date): string {
  return format(date, 'dd/MM/yyyy HH:mm');
}