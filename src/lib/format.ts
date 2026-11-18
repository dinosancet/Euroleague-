/** Date helpers. All game times come in UTC and are shown in the phone's time zone. */

const pad = (n: number) => String(n).padStart(2, "0");

export function formatTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "2026-11-17" in the phone's local time zone. */
export function localDayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const MONTHS = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

export function formatDay(iso: string) {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

export const MONTHS_LONG = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

/** Inverse of localDayKey: midnight of that day in the phone's time zone. */
export function dayFromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Day key moved by a number of days (negative goes back). */
export function addDays(key: string, days: number) {
  const d = dayFromKey(key);
  d.setDate(d.getDate() + days);
  return localDayKey(d);
}

/** The seven day keys Monday to Sunday of the week that contains `key`. */
export function weekOf(key: string) {
  const d = dayFromKey(key);
  const monday = addDays(key, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Month grid for a calendar, weeks starting on Monday. Each row has seven
 * cells; days outside the month are null.
 */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let day = 1; day <= count; day++)
    cells.push(localDayKey(new Date(year, month, day)));
  while (cells.length % 7) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}
