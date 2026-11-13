import type { PlannedShift } from "@/lib/api-client";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local-date key "YYYY-MM-DD" (never via toISOString: that shifts the day in UTC+ zones). */
export const toDateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseKey = (key: string): Date => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key: string, days: number): string => {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};

/** Monday of the week containing `key`. */
export const mondayOf = (key: string): string => addDays(key, -((parseKey(key).getDay() + 6) % 7));

/** The 7 dates (Monday to Sunday) of the week containing `key`. */
export const weekDates = (key: string): string[] => {
  const monday = mondayOf(key);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};

/** All dates of a month (month is 1-12). */
export const monthDates = (year: number, month: number): string[] => {
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`);
};

/** Planned minutes as "38h 30m"; zero minutes are omitted ("8h"). */
export const formatPlannedHours = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** Overnight shifts end the next day: end <= start. */
export const isOvernight = (s: Pick<PlannedShift, "start_time" | "end_time">): boolean => s.end_time <= s.start_time;

/** Cell label: short code (or hours for custom shifts), "+1" marks overnight; several shifts joined by " / ". */
export const cellText = (shifts: PlannedShift[]): string =>
  shifts
    .map((s) => `${s.short_code ?? `${s.start_time}-${s.end_time}`}${isOvernight(s) ? "+1" : ""}`)
    .join(" / ");
