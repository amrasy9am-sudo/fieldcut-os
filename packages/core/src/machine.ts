export const STATUSES = [
  "SUBMITTED", "CONFIRMED", "IN_PREP", "PACKED", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP",
  "COMPLETED", "EXPIRED", "CANCELLED", "NO_SHOW",
] as const;
export type Status = (typeof STATUSES)[number];

export type OrderEvent =
  | "confirm" | "expire" | "cancel" | "lock" | "pack" | "dispatch" | "ready" | "complete" | "no_show";

export type Actor = "customer" | "owner" | "system";

export const TRANSITIONS: Partial<Record<Status, Partial<Record<OrderEvent, Status>>>> = {
  SUBMITTED: { confirm: "CONFIRMED", expire: "EXPIRED", cancel: "CANCELLED" },
  CONFIRMED: { lock: "IN_PREP", cancel: "CANCELLED" },
  IN_PREP: { pack: "PACKED" },
  PACKED: { dispatch: "OUT_FOR_DELIVERY", ready: "READY_FOR_PICKUP" },
  OUT_FOR_DELIVERY: { complete: "COMPLETED", no_show: "NO_SHOW" },
  READY_FOR_PICKUP: { complete: "COMPLETED", no_show: "NO_SHOW" },
};

const ALLOWED: Record<Actor, OrderEvent[]> = {
  customer: ["cancel"],
  owner: ["confirm", "cancel", "lock", "pack", "dispatch", "ready", "complete", "no_show"],
  system: ["expire", "lock"],
};

/** Statuses that occupy kitchen capacity. */
export const ACTIVE_STATUSES: Status[] = ["SUBMITTED", "CONFIRMED", "IN_PREP", "PACKED", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "COMPLETED"];
/** Statuses that are still open (not finished). */
export const OPEN_STATUSES: Status[] = ["SUBMITTED", "CONFIRMED", "IN_PREP", "PACKED", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP"];

export function transition(status: Status, event: OrderEvent, actor: Actor):
  { ok: true; next: Status } | { ok: false; error: string } {
  const next = TRANSITIONS[status]?.[event];
  if (!next) return { ok: false, error: `Can't ${event.replace("_", "-")} an order that is ${label(status).toLowerCase()}.` };
  if (!ALLOWED[actor].includes(event)) return { ok: false, error: "Not allowed." };
  return { ok: true, next };
}

export function nextEvents(status: Status, mode: "delivery" | "pickup"): OrderEvent[] {
  const events = Object.keys(TRANSITIONS[status] ?? {}) as OrderEvent[];
  return events.filter((e) => e !== "expire" && !(mode === "delivery" && e === "ready") && !(mode === "pickup" && e === "dispatch"));
}

const LABELS: Record<Status, string> = {
  SUBMITTED: "Awaiting WhatsApp",
  CONFIRMED: "Confirmed",
  IN_PREP: "In prep",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for delivery",
  READY_FOR_PICKUP: "Ready for pick-up",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

export function label(status: Status): string {
  return LABELS[status];
}

export const EVENT_LABELS: Record<OrderEvent, string> = {
  confirm: "Confirm",
  expire: "Expire",
  cancel: "Cancel",
  lock: "Start prep",
  pack: "Mark packed",
  dispatch: "Out for delivery",
  ready: "Ready for pick-up",
  complete: "Complete",
  no_show: "No-show",
};

export function isStatus(s: string): s is Status {
  return (STATUSES as readonly string[]).includes(s);
}
