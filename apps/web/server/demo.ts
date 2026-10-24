import "server-only";
import { nextBookableDate } from "@fieldcut/core";
import { closedDates, hasAnyOrders, loadDemoData } from "./repo";
import { serviceDate } from "./service-date";

/** Public portfolio demo: FIELDCUT_DEMO=1. Shows a banner, the console password, and fills an empty database. */
export function isDemo(): boolean {
  const v = process.env.FIELDCUT_DEMO;
  return v === "1" || v === "true";
}

const state = globalThis as unknown as { __fieldcutDemoSeeded?: boolean };

/** Load sample orders once per server start when the database is empty, so the console looks lived-in. */
export function ensureDemoData(now: Date) {
  if (!isDemo() || state.__fieldcutDemoSeeded) return;
  state.__fieldcutDemoSeeded = true;
  if (!hasAnyOrders()) loadDemoData(now, serviceDate(now), nextBookableDate(now, closedDates()));
}
