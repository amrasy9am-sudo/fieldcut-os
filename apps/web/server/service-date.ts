import "server-only";
import { addDays, isOperatingDay, klDateKey, klTime, type DateKey } from "@fieldcut/core";
import { closedDates, dateSummary } from "./repo";

/** The day the kitchen is working towards: today until service ends at 14:30, then the next open day. */
export function serviceDate(now: Date): DateKey {
  const closed = closedDates();
  let d = klDateKey(now);
  const open = (x: DateKey) => isOperatingDay(x) && !closed.has(x);
  if (klTime(now) >= "14:30" || !open(d)) {
    d = addDays(d, 1);
    for (let i = 0; i < 14 && !open(d); i++) d = addDays(d, 1);
  }
  return d;
}

export function pickDate(raw: string | string[] | undefined, fallback: DateKey): DateKey {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
}

/** For the Today screen: the service date, or the next day within a week that already has orders. */
export function focusDate(now: Date): { date: DateKey; isNextWithOrders: boolean } {
  const first = serviceDate(now);
  if (dateSummary(first).orders > 0) return { date: first, isNextWithOrders: false };
  for (let i = 1; i <= 7; i++) {
    const d = addDays(first, i);
    if (dateSummary(d).orders > 0) return { date: d, isNextWithOrders: true };
  }
  return { date: first, isNextWithOrders: false };
}
