import "server-only";
import { nextBookableDate } from "@fieldcut/core";
import { isDemo } from "./mode";
import { closedDates, hasAnyOrders, loadDemoData } from "./repo";
import { serviceDate } from "./service-date";

export { isDemo } from "./mode";

const state = globalThis as unknown as { __fieldcutDemoSeeded?: boolean };

/** Load sample orders once per server start when the database is empty, so the console looks lived-in. */
export function ensureDemoData(now: Date) {
  if (!isDemo() || state.__fieldcutDemoSeeded) return;
  state.__fieldcutDemoSeeded = true;
  if (!hasAnyOrders()) loadDemoData(now, serviceDate(now), nextBookableDate(now, closedDates()));
}
