export type DateKey = string; // YYYY-MM-DD in the learner's local time

export const DAY_MS = 86_400_000;

export function dateKey(d: Date | number = Date.now()): DateKey {
  const x = typeof d === 'number' ? new Date(d) : d;
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(key: DateKey, n: number): DateKey {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n));
}

const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
const DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

export function formatDateMs(key: DateKey, withDay = false): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${withDay ? DAYS[date.getDay()] + ', ' : ''}${d} ${MONTHS[m - 1]} ${y}`;
}

/** "dalam 3 hari", "esok", "hari ini" for review due dates. */
export function relativeDue(due: number, now = Date.now()): string {
  const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY_MS);
  if (due <= now) return 'sekarang';
  if (days <= 0) return 'hari ini';
  if (days === 1) return 'esok';
  if (days < 30) return `dalam ${days} hari`;
  return `dalam ${Math.round(days / 30)} bulan`;
}
