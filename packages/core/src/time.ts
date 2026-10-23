/**
 * Time rules for the kitchen. Malaysia has no daylight saving, so Asia/Kuala_Lumpur is always UTC+8.
 * Dates are "YYYY-MM-DD" strings in Malaysian time; instants are Date objects (UTC internally).
 */
export const KL_OFFSET_MS = 8 * 60 * 60 * 1000;
export const CUTOFF_TIME = "22:00";
export const HOLD_SWEEP_TIME = "22:30";
export const BOOKING_WINDOW_DAYS = 7;

export type DateKey = string;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isDateKey(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function klDateKey(instant: Date): DateKey {
  return new Date(instant.getTime() + KL_OFFSET_MS).toISOString().slice(0, 10);
}

export function klTime(instant: Date): string {
  return new Date(instant.getTime() + KL_OFFSET_MS).toISOString().slice(11, 16);
}

export function addDays(date: DateKey, days: number): DateKey {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(date: DateKey): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Converts a Malaysian wall-clock time on a date to an instant. */
export function klInstant(date: DateKey, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00+08:00`);
}

/** Orders for a date close at 22:00 the night before. */
export function cutoffFor(date: DateKey): Date {
  return klInstant(addDays(date, -1), CUTOFF_TIME);
}

/** Unconfirmed orders hold capacity until 22:30 the night before. */
export function holdUntilFor(date: DateKey): Date {
  return klInstant(addDays(date, -1), HOLD_SWEEP_TIME);
}

export function isOperatingDay(date: DateKey): boolean {
  return weekday(date) !== 0; // Monday–Saturday
}

export type DateOption = { date: DateKey; label: string; bookable: boolean; reason?: string };

/** The next days a customer can see in the date picker, with the reason any of them is disabled. */
export function dateOptions(now: Date, closed: ReadonlySet<DateKey>, days = BOOKING_WINDOW_DAYS): DateOption[] {
  const today = klDateKey(now);
  const out: DateOption[] = [];
  for (let i = 0; i <= days; i++) {
    const date = addDays(today, i);
    let reason: string | undefined;
    if (!isOperatingDay(date)) reason = "Closed";
    else if (closed.has(date)) reason = "Closed";
    else if (now >= cutoffFor(date)) reason = "Cut-off passed";
    out.push({ date, label: formatDateShort(date), bookable: !reason, reason });
  }
  return out;
}

export const PLAN_WINDOW_DAYS = 14;

export function isBookable(date: DateKey, now: Date, closed: ReadonlySet<DateKey>, windowDays = BOOKING_WINDOW_DAYS): boolean {
  if (!isDateKey(date)) return false;
  const today = klDateKey(now);
  if (date < today || date > addDays(today, windowDays)) return false;
  return isOperatingDay(date) && !closed.has(date) && now < cutoffFor(date);
}

/** The first date that can still be ordered for. */
export function nextBookableDate(now: Date, closed: ReadonlySet<DateKey>): DateKey | null {
  return dateOptions(now, closed).find((d) => d.bookable)?.date ?? null;
}

export function formatDateShort(date: DateKey): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function formatDateLong(date: DateKey): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatKlDateTime(instant: Date): string {
  return `${formatDateShort(klDateKey(instant))} ${klTime(instant)}`;
}

/** Monday of the week after `now` (for five-day plans). */
export function nextWeekMonday(now: Date): DateKey {
  const today = klDateKey(now);
  const wd = weekday(today);
  const daysUntilMonday = ((8 - wd) % 7) || 7;
  return addDays(today, daysUntilMonday);
}
