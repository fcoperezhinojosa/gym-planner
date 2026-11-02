/**
 * Fechas como strings 'YYYY-MM-DD' (fecha local del usuario, sin hora).
 * Toda la aritmética se hace en UTC para evitar problemas de horario de verano.
 */

export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE ?? "Europe/Madrid";

export function todayISO(now: Date = new Date(), timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function toUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTC(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / 86_400_000);
}

/** 1 = lunes … 7 = domingo */
export function isoWeekday(iso: string): number {
  const wd = toUTC(iso).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function startOfWeek(iso: string): string {
  return addDays(iso, 1 - isoWeekday(iso));
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + "01";
}

export function addMonths(iso: string, months: number): string {
  const d = toUTC(startOfMonth(iso));
  d.setUTCMonth(d.getUTCMonth() + months);
  return fromUTC(d);
}

export function daysInMonth(iso: string): number {
  const d = toUTC(startOfMonth(iso));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.getUTCDate();
}

export function range(fromISO: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(fromISO, i));
}

export function formatShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}/${m}`;
}

export function isValidISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUTC(s).getTime());
}
