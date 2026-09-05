export const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function daysInMonth(monthKey: string): number {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  return new Date(y, m, 0).getDate();
}

export function monthLabel(monthKey: string): string {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  return `${MESI[m - 1]} ${y}`;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function formatDateIT(iso: string): string {
  // iso: YYYY-MM-DD
  const y = parseInt(iso.slice(0, 4), 10);
  const m = parseInt(iso.slice(5, 7), 10);
  const day = parseInt(iso.slice(8, 10), 10);
  const wd = new Date(y, m - 1, day).getDay();
  return `${GIORNI[wd]} ${day} ${MESI[m - 1].slice(0, 3)}`;
}

export function weekdayShort(monthKey: string, day: number): string {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  return GIORNI[new Date(y, m - 1, day).getDay()];
}

export function isWeekend(monthKey: string, day: number): boolean {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  const wd = new Date(y, m - 1, day).getDay();
  return wd === 0 || wd === 6;
}
