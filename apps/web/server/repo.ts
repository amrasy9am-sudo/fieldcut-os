import "server-only";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import {
  ACTIVE_STATUSES, BOWLS, OPEN_STATUSES, addDays, availability, bowlCogsSen, canReserve, checkTierLimits,
  cutoffFor, getArea, holdUntilFor, isBookable, PLAN_WINDOW_DAYS, klDateKey, makeRef, planBowlPriceSen, priceLine, quoteOrder,
  randomRefBody, tierFor, transition, ZONES,
  type Actor, type Bowl, type BowlSlug, type DateKey, type FulfilmentMode, type LineInput, type OrderEvent,
  type PricedLine, type PriceOverrides, type SlotAvailability, type SlotDef, type SlotUsage, type Status, type Tier,
} from "@fieldcut/core";
import { db, tx } from "./db";
import { computeVerifyCode, normalizeCode } from "./verify";

type Row = Record<string, unknown>;

function all<T>(d: DatabaseSync, sql: string, ...params: SQLInputValue[]): T[] {
  return d.prepare(sql).all(...params) as unknown as T[];
}
function one<T>(d: DatabaseSync, sql: string, ...params: SQLInputValue[]): T | undefined {
  return d.prepare(sql).get(...params) as unknown as T | undefined;
}
const inList = (xs: readonly string[]) => xs.map((s) => `'${s}'`).join(",");

/* ------------------------------------------------------------------ menu */

export type MenuBowl = Bowl & { listPriceSen: number; active: boolean; cogsSen: number };

export function getMenu(): MenuBowl[] {
  const rows = all<{ slug: string; price_sen: number; active: number }>(db(), "SELECT slug, price_sen, active FROM menu_items");
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return BOWLS.map((b) => {
    const r = bySlug.get(b.slug);
    return { ...b, listPriceSen: b.priceSen, priceSen: r?.price_sen ?? b.priceSen, active: (r?.active ?? 1) === 1, cogsSen: bowlCogsSen(b) };
  });
}

export function priceOverrides(): PriceOverrides {
  return Object.fromEntries(getMenu().map((b) => [b.slug, b.priceSen]));
}

export function updateMenuItem(slug: BowlSlug, priceSen: number, active: boolean) {
  db().prepare("UPDATE menu_items SET price_sen = ?, active = ? WHERE slug = ?").run(priceSen, active ? 1 : 0, slug);
}

/* ------------------------------------------------------------------ slots & capacity */

export function getSlotDefs(): SlotDef[] {
  return all<{ id: number; label: string; start_time: string; end_time: string; default_capacity: number; active: number }>(
    db(), "SELECT * FROM slots ORDER BY start_time",
  ).map((r) => ({ id: r.id, label: r.label, start: r.start_time, end: r.end_time, defaultCapacity: r.default_capacity, active: r.active === 1 }));
}

export function updateSlot(id: number, defaultCapacity: number, active: boolean) {
  db().prepare("UPDATE slots SET default_capacity = ?, active = ? WHERE id = ?").run(defaultCapacity, active ? 1 : 0, id);
}

export function closedDates(): Set<DateKey> {
  return new Set(all<{ date: string }>(db(), "SELECT date FROM closed_dates").map((r) => r.date));
}

export function listClosedDates(): { date: DateKey; reason: string | null }[] {
  return all(db(), "SELECT date, reason FROM closed_dates ORDER BY date");
}

export function setClosed(date: DateKey, closed: boolean, reason?: string) {
  if (closed) db().prepare("INSERT OR REPLACE INTO closed_dates (date, reason) VALUES (?, ?)").run(date, reason ?? null);
  else db().prepare("DELETE FROM closed_dates WHERE date = ?").run(date);
}

export function setCapacityOverride(date: DateKey, slotId: number, capacity: number | null) {
  if (capacity === null) db().prepare("DELETE FROM slot_overrides WHERE date = ? AND slot_id = ?").run(date, slotId);
  else db().prepare("INSERT OR REPLACE INTO slot_overrides (date, slot_id, capacity) VALUES (?, ?, ?)").run(date, slotId, capacity);
}

function usageFor(d: DatabaseSync, date: DateKey): Map<number, SlotUsage> {
  const slots = all<{ id: number; default_capacity: number }>(d, "SELECT id, default_capacity FROM slots");
  const overrides = new Map(
    all<{ slot_id: number; capacity: number }>(d, "SELECT slot_id, capacity FROM slot_overrides WHERE date = ?", date).map((r) => [r.slot_id, r.capacity]),
  );
  const used = all<{ slot_id: number; held: number; confirmed: number }>(
    d,
    `SELECT slot_id,
            SUM(CASE WHEN status = 'SUBMITTED' THEN bowls ELSE 0 END) AS held,
            SUM(CASE WHEN status <> 'SUBMITTED' THEN bowls ELSE 0 END) AS confirmed
       FROM orders WHERE slot_date = ? AND status IN (${inList(ACTIVE_STATUSES)}) GROUP BY slot_id`,
    date,
  );
  const usedBy = new Map(used.map((u) => [u.slot_id, u]));
  return new Map(
    slots.map((s) => [
      s.id,
      { capacity: overrides.get(s.id) ?? s.default_capacity, held: usedBy.get(s.id)?.held ?? 0, confirmed: usedBy.get(s.id)?.confirmed ?? 0 },
    ]),
  );
}

export type SlotView = SlotAvailability & { start: string; end: string; active: boolean; overridden: boolean };

export function availabilityFor(date: DateKey, opts: { includeInactive?: boolean } = {}): SlotView[] {
  const d = db();
  const usage = usageFor(d, date);
  const overridden = new Set(all<{ slot_id: number }>(d, "SELECT slot_id FROM slot_overrides WHERE date = ?", date).map((r) => r.slot_id));
  return getSlotDefs()
    .filter((s) => s.active || opts.includeInactive)
    .map((s) => ({ ...availability(s, usage.get(s.id)!), start: s.start, end: s.end, active: s.active, overridden: overridden.has(s.id) }));
}

/* ------------------------------------------------------------------ holds */

/** Releases capacity held by orders nobody confirmed before the 22:30 sweep. Safe to call often. */
export function expireHolds(now: Date): number {
  return tx((d) => {
    const due = all<{ id: number }>(d, "SELECT id FROM orders WHERE status = 'SUBMITTED' AND hold_expires_at <= ?", now.toISOString());
    const update = d.prepare("UPDATE orders SET status = 'EXPIRED' WHERE id = ?");
    const event = d.prepare("INSERT INTO order_events (order_id, type, from_status, to_status, actor, note, at) VALUES (?, 'expire', 'SUBMITTED', 'EXPIRED', 'system', 'Not confirmed before 22:30', ?)");
    for (const o of due) {
      update.run(o.id);
      event.run(o.id, now.toISOString());
    }
    return due.length;
  });
}

/* ------------------------------------------------------------------ customers */

export type CustomerStats = { completed: number; noShowsLast60Days: number; openOrders: number; tier: Tier };

function statsFor(d: DatabaseSync, customerId: number, now: Date): CustomerStats {
  const since = addDays(klDateKey(now), -60);
  const r = one<{ completed: number; no_shows: number }>(
    d,
    `SELECT SUM(status = 'COMPLETED') AS completed,
            SUM(status = 'NO_SHOW' AND slot_date >= ?) AS no_shows
       FROM orders WHERE customer_id = ? AND is_demo = 0`,
    since, customerId,
  );
  const open = one<{ n: number }>(
    d,
    `SELECT COUNT(DISTINCT COALESCE(plan_ref, ref)) AS n FROM orders WHERE customer_id = ? AND status IN (${inList(OPEN_STATUSES)})`,
    customerId,
  );
  const completed = r?.completed ?? 0;
  const noShowsLast60Days = r?.no_shows ?? 0;
  return { completed, noShowsLast60Days, openOrders: open?.n ?? 0, tier: tierFor({ completed, noShowsLast60Days }) };
}

export type CustomerRow = {
  id: number; name: string; phone: string; created_at: string;
  orders: number; completed: number; no_shows: number; spent_sen: number; last_date: string | null; tier: Tier;
};

export function listCustomers(now: Date): CustomerRow[] {
  const d = db();
  const rows = all<Omit<CustomerRow, "tier">>(
    d,
    `SELECT c.id, c.name, c.phone, c.created_at,
            COUNT(o.id) AS orders,
            SUM(o.status = 'COMPLETED') AS completed,
            SUM(o.status = 'NO_SHOW') AS no_shows,
            SUM(CASE WHEN o.status = 'COMPLETED' THEN o.total_sen ELSE 0 END) AS spent_sen,
            MAX(o.slot_date) AS last_date
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id ORDER BY last_date DESC`,
  );
  return rows.map((r) => ({ ...r, completed: r.completed ?? 0, no_shows: r.no_shows ?? 0, spent_sen: r.spent_sen ?? 0, tier: statsFor(d, r.id, now).tier }));
}

/* ------------------------------------------------------------------ creating orders */

export type SettlementMethod = "cod" | "pickup" | "arranged";
export const SETTLEMENT_LABELS: Record<SettlementMethod, string> = {
  cod: "Cash on delivery",
  pickup: "Pay at pick-up",
  arranged: "Arranged on WhatsApp",
};

export type CreateOrderInput = {
  name: string;
  phone: string; // E.164
  mode: FulfilmentMode;
  areaId: string | null;
  address: string | null;
  notes: string | null;
  settlement: SettlementMethod;
  idemKey: string;
  now: Date;
} & ({ kind: "order"; date: DateKey; slotId: number; lines: LineInput[] } | { kind: "plan"; slotId: number; days: { date: DateKey; slug: BowlSlug }[] });

export type CreateResult =
  | { ok: true; ref: string }
  | { ok: false; error: string; code: "INVALID" | "CUTOFF_PASSED" | "SLOT_FULL" | "TIER_LIMIT" | "OUT_OF_ZONE" };

type DayDraft = { date: DateKey; lines: PricedLine[]; subtotalSen: number; deliverySen: number; bowls: number };

export function createOrder(input: CreateOrderInput): CreateResult {
  return tx((d): CreateResult => {
    const existing = one<{ ref: string; plan_ref: string | null }>(d, "SELECT ref, plan_ref FROM orders WHERE idem_key = ?", input.idemKey);
    if (existing) return { ok: true, ref: existing.plan_ref ?? existing.ref };

    const area = input.areaId ? getArea(input.areaId) : undefined;
    const zone = input.mode === "delivery" ? (area?.zone ?? null) : null;
    if (input.mode === "delivery" && !area) return { ok: false, code: "INVALID", error: "Choose your delivery area." };
    if (input.mode === "delivery" && !input.address) return { ok: false, code: "INVALID", error: "Enter your delivery address." };
    if (input.mode === "delivery" && zone === null) {
      return { ok: false, code: "OUT_OF_ZONE", error: "That area is outside our 8 km delivery radius. Please choose self pick-up." };
    }

    const slot = one<{ id: number; label: string; active: number }>(d, "SELECT id, label, active FROM slots WHERE id = ?", input.slotId);
    if (!slot || slot.active !== 1) return { ok: false, code: "INVALID", error: "Choose a delivery slot." };

    const overrides: PriceOverrides = Object.fromEntries(
      all<{ slug: string; price_sen: number }>(d, "SELECT slug, price_sen FROM menu_items").map((r) => [r.slug, r.price_sen]),
    );
    const inactive = new Set(all<{ slug: string }>(d, "SELECT slug FROM menu_items WHERE active = 0").map((r) => r.slug));
    const closed = new Set(all<{ date: string }>(d, "SELECT date FROM closed_dates").map((r) => r.date));

    const drafts: DayDraft[] = [];
    if (input.kind === "order") {
      if (input.lines.some((l) => inactive.has(l.slug))) return { ok: false, code: "INVALID", error: "One of your bowls is sold out today. Please remove it." };
      const q = quoteOrder({ lines: input.lines, mode: input.mode, zone, overrides });
      if (q.problems.length) return { ok: false, code: zone === null && input.mode === "delivery" ? "OUT_OF_ZONE" : "INVALID", error: q.problems[0] };
      drafts.push({ date: input.date, lines: q.lines, subtotalSen: q.subtotalSen, deliverySen: q.deliverySen, bowls: q.bowls });
    } else {
      if (input.days.length !== 5) return { ok: false, code: "INVALID", error: "Pick a bowl for each of the five days." };
      for (const day of input.days) {
        if (inactive.has(day.slug)) return { ok: false, code: "INVALID", error: "One of your bowls is sold out. Please pick another." };
        const bowl = BOWLS.find((b) => b.slug === day.slug)!;
        const priced = priceLine({ slug: day.slug, qty: 1, dressing: bowl.dressing, addOns: {}, leaveOut: [] });
        const unit = planBowlPriceSen(day.slug);
        drafts.push({
          date: day.date,
          lines: [{ ...priced, unitSen: unit, lineSen: unit, detail: `${priced.detail} · plan` }],
          subtotalSen: unit,
          deliverySen: zone ? ZONES[zone].planFeeSen : 0,
          bowls: 1,
        });
      }
    }

    for (const day of drafts) {
      if (!isBookable(day.date, input.now, closed, input.kind === "plan" ? PLAN_WINDOW_DAYS : undefined)) {
        return { ok: false, code: "CUTOFF_PASSED", error: "Orders for that day have closed. Please choose another date." };
      }
    }

    // Customer & trust tier
    let customer = one<{ id: number }>(d, "SELECT id FROM customers WHERE phone = ?", input.phone);
    if (!customer) {
      const r = d.prepare("INSERT INTO customers (phone, name, created_at) VALUES (?, ?, ?)").run(input.phone, input.name, input.now.toISOString());
      customer = { id: Number(r.lastInsertRowid) };
    } else {
      d.prepare("UPDATE customers SET name = ? WHERE id = ?").run(input.name, customer.id);
    }
    const stats = statsFor(d, customer.id, input.now);
    const total = drafts.reduce((s, x) => s + x.subtotalSen + x.deliverySen, 0);
    const tierProblem = checkTierLimits({ tier: stats.tier, orderTotalSen: total, openOrders: stats.openOrders, isPlan: input.kind === "plan" });
    if (tierProblem) return { ok: false, code: "TIER_LIMIT", error: tierProblem };

    // Capacity — checked and reserved inside the same transaction.
    for (const day of drafts) {
      const usage = usageFor(d, day.date).get(slot.id)!;
      const needed = drafts.filter((x) => x.date === day.date).reduce((s, x) => s + x.bowls, 0);
      if (!canReserve(usage, needed)) {
        const left = Math.max(0, usage.capacity - usage.held - usage.confirmed);
        return {
          ok: false,
          code: "SLOT_FULL",
          error: left > 0
            ? `Only ${left} bowl${left === 1 ? "" : "s"} left in the ${slot.label} slot. Reduce your order or pick another slot.`
            : `The ${slot.label} slot just filled up. Please pick another slot or day.`,
        };
      }
    }

    const refs = drafts.map((day) => {
      for (;;) {
        const ref = makeRef(day.date, randomRefBody());
        if (!one(d, "SELECT 1 FROM orders WHERE ref = ?", ref)) return ref;
      }
    });
    const planRef = input.kind === "plan" ? refs[0] : null;
    const verifyCode = computeVerifyCode({
      ref: planRef ?? refs[0],
      phone: input.phone,
      slot: slot.id,
      days: drafts.map((x) => ({ date: x.date, items: x.lines.map((l) => [l.slug, l.qty, l.dressing, l.addOns, l.leaveOut]) })),
      total,
    });
    const insertOrder = d.prepare(
      `INSERT INTO orders (ref, plan_ref, customer_id, slot_date, slot_id, mode, zone, area, address, notes, status, settlement_method,
         subtotal_sen, delivery_sen, total_sen, bowls, verify_code, idem_key, hold_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertItem = d.prepare(
      `INSERT INTO order_items (order_id, slug, name, qty, dressing, add_ons, leave_out, detail, unit_sen, line_sen, kcal, protein_g)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertEvent = d.prepare(
      "INSERT INTO order_events (order_id, type, from_status, to_status, actor, note, at) VALUES (?, 'created', NULL, 'SUBMITTED', 'customer', ?, ?)",
    );
    drafts.forEach((day, i) => {
      const r = insertOrder.run(
        refs[i], planRef, customer.id, day.date, slot.id, input.mode, zone, area?.id ?? null, input.address, input.notes,
        input.settlement, day.subtotalSen, day.deliverySen, day.subtotalSen + day.deliverySen, day.bowls, verifyCode,
        i === 0 ? input.idemKey : `${input.idemKey}:${i}`, holdUntilFor(day.date).toISOString(), input.now.toISOString(),
      );
      const orderId = Number(r.lastInsertRowid);
      for (const l of day.lines) {
        insertItem.run(orderId, l.slug, l.name, l.qty, l.dressing, JSON.stringify(l.addOns), JSON.stringify(l.leaveOut), l.detail, l.unitSen, l.lineSen, l.kcal, l.proteinG);
      }
      insertEvent.run(orderId, planRef ? `Five-day plan ${planRef}` : null, input.now.toISOString());
    });
    return { ok: true, ref: refs[0] };
  });
}

/* ------------------------------------------------------------------ reading orders */

export type OrderItem = {
  slug: BowlSlug; name: string; qty: number; dressing: LineInput["dressing"]; addOns: LineInput["addOns"]; leaveOut: LineInput["leaveOut"];
  detail: string; unitSen: number; lineSen: number; kcal: number; proteinG: number;
};

export type OrderEventRow = { type: string; from_status: string | null; to_status: string | null; actor: string; note: string | null; at: string };

export type OrderView = {
  id: number; ref: string; planRef: string | null; date: DateKey; slotId: number; slotLabel: string; slotStart: string;
  mode: FulfilmentMode; zone: string | null; areaId: string | null; areaName: string | null; address: string | null; notes: string | null;
  status: Status; settlement: "UNSETTLED" | "SETTLED" | "WAIVED"; settlementMethod: SettlementMethod;
  subtotalSen: number; deliverySen: number; totalSen: number; bowls: number; verifyCode: string; holdExpiresAt: string;
  createdAt: string; isDemo: boolean; customerId: number; name: string; phone: string; items: OrderItem[];
};

const ORDER_SELECT = `
  SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, s.label AS slot_label, s.start_time AS slot_start
    FROM orders o JOIN customers c ON c.id = o.customer_id JOIN slots s ON s.id = o.slot_id`;

function toView(d: DatabaseSync, r: Row, withItems = true): OrderView {
  const id = r.id as number;
  const items = withItems
    ? all<Row>(d, "SELECT * FROM order_items WHERE order_id = ? ORDER BY id", id).map((i) => ({
        slug: i.slug as BowlSlug, name: i.name as string, qty: i.qty as number, dressing: i.dressing as OrderItem["dressing"],
        addOns: JSON.parse(i.add_ons as string), leaveOut: JSON.parse(i.leave_out as string), detail: i.detail as string,
        unitSen: i.unit_sen as number, lineSen: i.line_sen as number, kcal: i.kcal as number, proteinG: i.protein_g as number,
      }))
    : [];
  const areaId = (r.area as string | null) ?? null;
  return {
    id, ref: r.ref as string, planRef: (r.plan_ref as string | null) ?? null, date: r.slot_date as string, slotId: r.slot_id as number,
    slotLabel: r.slot_label as string, slotStart: r.slot_start as string, mode: r.mode as FulfilmentMode, zone: (r.zone as string | null) ?? null,
    areaId, areaName: areaId ? (getArea(areaId)?.name ?? areaId) : null, address: (r.address as string | null) ?? null, notes: (r.notes as string | null) ?? null,
    status: r.status as Status, settlement: r.settlement as OrderView["settlement"], settlementMethod: r.settlement_method as SettlementMethod,
    subtotalSen: r.subtotal_sen as number, deliverySen: r.delivery_sen as number, totalSen: r.total_sen as number, bowls: r.bowls as number,
    verifyCode: r.verify_code as string, holdExpiresAt: r.hold_expires_at as string, createdAt: r.created_at as string, isDemo: r.is_demo === 1,
    customerId: r.customer_id as number, name: r.customer_name as string, phone: r.customer_phone as string, items,
  };
}

export function getOrder(ref: string): OrderView | null {
  const d = db();
  const r = one<Row>(d, `${ORDER_SELECT} WHERE o.ref = ?`, ref);
  return r ? toView(d, r) : null;
}

export function getPlanOrders(planRef: string): OrderView[] {
  const d = db();
  return all<Row>(d, `${ORDER_SELECT} WHERE o.plan_ref = ? ORDER BY o.slot_date`, planRef).map((r) => toView(d, r));
}

export function getEvents(orderId: number): OrderEventRow[] {
  return all(db(), "SELECT type, from_status, to_status, actor, note, at FROM order_events WHERE order_id = ? ORDER BY id", orderId);
}

export function listOrdersForDate(date: DateKey, statuses?: readonly Status[]): OrderView[] {
  const d = db();
  const where = statuses ? `AND o.status IN (${inList(statuses)})` : "";
  return all<Row>(d, `${ORDER_SELECT} WHERE o.slot_date = ? ${where} ORDER BY s.start_time, o.zone, o.created_at`, date).map((r) => toView(d, r));
}

export function listAwaiting(): OrderView[] {
  const d = db();
  return all<Row>(d, `${ORDER_SELECT} WHERE o.status = 'SUBMITTED' ORDER BY o.created_at`).map((r) => toView(d, r));
}

export function customerStats(customerId: number, now: Date): CustomerStats {
  return statsFor(db(), customerId, now);
}

export function customerOrders(customerId: number, limit = 10): OrderView[] {
  const d = db();
  return all<Row>(d, `${ORDER_SELECT} WHERE o.customer_id = ? ORDER BY o.slot_date DESC, o.id DESC LIMIT ?`, customerId, limit).map((r) => toView(d, r, false));
}

/* ------------------------------------------------------------------ changing orders */

export type EventResult = { ok: true; status: Status; affected: number } | { ok: false; error: string };

export function applyEvent(ref: string, event: OrderEvent, actor: Actor, now: Date, note?: string): EventResult {
  return tx((d): EventResult => {
    const order = one<{ id: number; status: Status; slot_date: string; plan_ref: string | null }>(
      d, "SELECT id, status, slot_date, plan_ref FROM orders WHERE ref = ?", ref,
    );
    if (!order) return { ok: false, error: "Order not found." };
    if (actor === "customer" && event === "cancel" && now >= cutoffFor(order.slot_date)) {
      return { ok: false, error: "This order can no longer be cancelled online — the kitchen has started. Message us on WhatsApp." };
    }
    // Confirming or cancelling a plan applies to every day still in the same status.
    const targets = order.plan_ref && (event === "confirm" || event === "cancel")
      ? all<{ id: number; status: Status; slot_date: string }>(d, "SELECT id, status, slot_date FROM orders WHERE plan_ref = ? AND status = ?", order.plan_ref, order.status)
          .filter((o) => actor !== "customer" || now < cutoffFor(o.slot_date))
      : [order];
    let next: Status | null = null;
    for (const t of targets) {
      const r = transition(t.status, event, actor);
      if (!r.ok) return r;
      next = r.next;
      d.prepare("UPDATE orders SET status = ? WHERE id = ?").run(r.next, t.id);
      d.prepare("INSERT INTO order_events (order_id, type, from_status, to_status, actor, note, at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(t.id, event, t.status, r.next, actor, note ?? null, now.toISOString());
    }
    return { ok: true, status: next ?? order.status, affected: targets.length };
  });
}

export function setSettlement(ref: string, settlement: "UNSETTLED" | "SETTLED" | "WAIVED", now: Date) {
  tx((d) => {
    const o = one<{ id: number; settlement: string }>(d, "SELECT id, settlement FROM orders WHERE ref = ?", ref);
    if (!o || o.settlement === settlement) return;
    d.prepare("UPDATE orders SET settlement = ? WHERE id = ?").run(settlement, o.id);
    d.prepare("INSERT INTO order_events (order_id, type, actor, note, at) VALUES (?, 'settlement', 'owner', ?, ?)").run(o.id, settlement, now.toISOString());
  });
}

/** 22:30 lock: every confirmed order for the date moves into prep. */
export function lockDate(date: DateKey, actor: Actor, now: Date): number {
  return tx((d) => {
    const rows = all<{ id: number }>(d, "SELECT id FROM orders WHERE slot_date = ? AND status = 'CONFIRMED'", date);
    for (const r of rows) {
      d.prepare("UPDATE orders SET status = 'IN_PREP' WHERE id = ?").run(r.id);
      d.prepare("INSERT INTO order_events (order_id, type, from_status, to_status, actor, at) VALUES (?, 'lock', 'CONFIRMED', 'IN_PREP', ?, ?)").run(r.id, actor, now.toISOString());
    }
    return rows.length;
  });
}

/** Recomputes the HMAC from what is stored and compares it to the code typed from WhatsApp. */
export function checkVerifyCode(ref: string, typed: string): { matches: boolean; expected: string } {
  const order = getOrder(ref);
  if (!order) return { matches: false, expected: "" };
  const planOrders = order.planRef ? getPlanOrders(order.planRef) : [order];
  const recomputed = computeVerifyCode({
    ref: order.planRef ?? order.ref,
    phone: order.phone,
    slot: order.slotId,
    days: planOrders.map((o) => ({ date: o.date, items: o.items.map((l) => [l.slug, l.qty, l.dressing, l.addOns, l.leaveOut]) })),
    total: planOrders.reduce((s, o) => s + o.totalSen, 0),
  });
  const intact = recomputed === order.verifyCode;
  return { matches: intact && normalizeCode(typed) === order.verifyCode, expected: order.verifyCode };
}

/* ------------------------------------------------------------------ dashboards & reports */

export function dateSummary(date: DateKey) {
  const d = db();
  const r = one<{ bowls: number; awaiting: number; due: number; cod: number; pickup: number; orders: number }>(
    d,
    `SELECT SUM(bowls) AS bowls, SUM(status = 'SUBMITTED') AS awaiting, SUM(total_sen) AS due, COUNT(*) AS orders,
            SUM(CASE WHEN mode = 'delivery' THEN total_sen ELSE 0 END) AS cod,
            SUM(CASE WHEN mode = 'pickup' THEN total_sen ELSE 0 END) AS pickup
       FROM orders WHERE slot_date = ? AND status IN (${inList(ACTIVE_STATUSES)})`,
    date,
  );
  return { bowls: r?.bowls ?? 0, awaiting: r?.awaiting ?? 0, dueSen: r?.due ?? 0, codSen: r?.cod ?? 0, pickupSen: r?.pickup ?? 0, orders: r?.orders ?? 0 };
}

export function reports(now: Date, days = 30) {
  const d = db();
  const today = klDateKey(now);
  const since = addDays(today, -days);
  const totals = one<{ orders: number; bowls: number; revenue: number; no_shows: number; finished: number; avg: number }>(
    d,
    `SELECT SUM(status = 'COMPLETED') AS orders, SUM(CASE WHEN status = 'COMPLETED' THEN bowls ELSE 0 END) AS bowls,
            SUM(CASE WHEN status = 'COMPLETED' THEN total_sen ELSE 0 END) AS revenue,
            SUM(status = 'NO_SHOW') AS no_shows, SUM(status IN ('COMPLETED','NO_SHOW')) AS finished,
            AVG(CASE WHEN status = 'COMPLETED' THEN total_sen END) AS avg
       FROM orders WHERE slot_date >= ? AND slot_date <= ?`,
    since, today,
  );
  const perDay = all<{ date: string; bowls: number }>(
    d,
    `SELECT slot_date AS date, SUM(bowls) AS bowls FROM orders
      WHERE slot_date >= ? AND slot_date <= ? AND status IN (${inList(ACTIVE_STATUSES)}) GROUP BY slot_date ORDER BY slot_date`,
    since, addDays(today, 7),
  );
  const mix = all<{ slug: string; qty: number }>(
    d,
    `SELECT i.slug, SUM(i.qty) AS qty FROM order_items i JOIN orders o ON o.id = i.order_id
      WHERE o.slot_date >= ? AND o.status IN (${inList(ACTIVE_STATUSES)}) GROUP BY i.slug ORDER BY qty DESC`,
    since,
  );
  const repeat = one<{ customers: number; repeaters: number }>(
    d,
    `SELECT COUNT(*) AS customers, SUM(n > 1) AS repeaters FROM
       (SELECT customer_id, COUNT(*) AS n FROM orders WHERE slot_date >= ? AND status = 'COMPLETED' GROUP BY customer_id)`,
    since,
  );
  const confirmTimes = all<{ created: string; confirmed: string }>(
    d,
    `SELECT o.created_at AS created, MIN(e.at) AS confirmed FROM orders o JOIN order_events e ON e.order_id = o.id AND e.type = 'confirm'
      WHERE o.slot_date >= ? GROUP BY o.id`,
    since,
  ).map((r) => (Date.parse(r.confirmed) - Date.parse(r.created)) / 60000).sort((a, b) => a - b);
  const settlement = one<{ unsettled: number }>(
    d, "SELECT SUM(total_sen) AS unsettled FROM orders WHERE status = 'COMPLETED' AND settlement = 'UNSETTLED' AND slot_date >= ?", since,
  );
  return {
    days,
    completedOrders: totals?.orders ?? 0,
    bowls: totals?.bowls ?? 0,
    revenueSen: totals?.revenue ?? 0,
    avgOrderSen: Math.round(totals?.avg ?? 0),
    noShowRate: totals?.finished ? (totals.no_shows ?? 0) / totals.finished : 0,
    repeatRate: repeat?.customers ? (repeat.repeaters ?? 0) / repeat.customers : 0,
    medianConfirmMinutes: confirmTimes.length ? confirmTimes[Math.floor(confirmTimes.length / 2)] : null,
    unsettledSen: settlement?.unsettled ?? 0,
    perDay,
    mix,
  };
}

/* ------------------------------------------------------------------ demo data */

export function hasAnyOrders(): boolean {
  return Boolean(one(db(), "SELECT 1 FROM orders LIMIT 1"));
}

export function clearDemoData() {
  tx((d) => {
    d.exec("DELETE FROM orders WHERE is_demo = 1");
    d.exec("DELETE FROM customers WHERE id NOT IN (SELECT DISTINCT customer_id FROM orders)");
  });
}

/** Fills the console with realistic sample orders (flagged is_demo) so every screen can be explored. */
export function loadDemoData(now: Date, serviceDay: DateKey, nextBookable: DateKey | null) {
  const names = ["Aina Sofea", "Haziq Rahman", "Nurul Aisyah", "Daniel Lim", "Farid Zainal", "Mei Ling", "Kumar Selvam", "Siti Nadia", "Hafiz Musa", "Lim Wei", "Ravi Kumar", "Amira Yusof"];
  const slugs: BowlSlug[] = ["field-classic", "field-classic", "sesame-teriyaki", "harbour-salmon", "garden-two-egg"];
  const areas = ["seri-manjung", "manjung-point", "sitiawan", "kampung-koh", "lumut"];
  let seed = 7;
  const rand = (n: number) => {
    seed = (seed * 9301 + 49297) % 233280;
    return Math.floor((seed / 233280) * n);
  };
  tx((d) => {
    const customerIds = names.map((name, i) => {
      const phone = `+6012${String(3000000 + i * 7919).padStart(7, "0")}`;
      const found = one<{ id: number }>(d, "SELECT id FROM customers WHERE phone = ?", phone);
      if (found) return found.id;
      return Number(d.prepare("INSERT INTO customers (phone, name, created_at) VALUES (?, ?, ?)").run(phone, name, now.toISOString()).lastInsertRowid);
    });
    const make = (date: DateKey, status: Status, settlement: string, createdAt: Date) => {
      const slug = slugs[rand(slugs.length)];
      const bowl = BOWLS.find((b) => b.slug === slug)!;
      const qty = 1 + rand(3);
      const line = priceLine({ slug, qty, dressing: bowl.dressing, addOns: rand(3) === 0 ? { "extra-egg": 1 } : {}, leaveOut: [] });
      const mode: FulfilmentMode = rand(4) === 0 ? "pickup" : "delivery";
      const areaId = mode === "delivery" ? areas[rand(areas.length)] : null;
      const zone = areaId ? getArea(areaId)!.zone : null;
      const delivery = zone ? ZONES[zone].feeSen : 0;
      // Respect real kitchen capacity: pick a slot that still has room for this order.
      const usage = usageFor(d, date);
      const slotIds = [1, 2, 3].filter((id) => canReserve(usage.get(id) ?? { capacity: 0, held: 0, confirmed: 0 }, qty));
      if (slotIds.length === 0) return;
      const slotId = slotIds[rand(slotIds.length)];
      const ref = makeRef(date, randomRefBody());
      const customerId = customerIds[rand(customerIds.length)];
      const r = d.prepare(
        `INSERT INTO orders (ref, customer_id, slot_date, slot_id, mode, zone, area, address, status, settlement, settlement_method,
           subtotal_sen, delivery_sen, total_sen, bowls, verify_code, hold_expires_at, is_demo, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DEMO-0000', ?, 1, ?)`,
      ).run(ref, customerId, date, slotId, mode, zone, areaId, areaId ? `No. ${1 + rand(80)}, Jalan Demo ${1 + rand(9)}` : null, status, settlement,
        mode === "delivery" ? "cod" : "pickup", line.lineSen, delivery, line.lineSen + delivery, qty, holdUntilFor(date).toISOString(), createdAt.toISOString());
      const id = Number(r.lastInsertRowid);
      d.prepare(`INSERT INTO order_items (order_id, slug, name, qty, dressing, add_ons, leave_out, detail, unit_sen, line_sen, kcal, protein_g)
                 VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?)`)
        .run(id, slug, line.name, qty, line.dressing, JSON.stringify(line.addOns), line.detail, line.unitSen, line.lineSen, line.kcal, line.proteinG);
      d.prepare("INSERT INTO order_events (order_id, type, to_status, actor, note, at) VALUES (?, 'created', 'SUBMITTED', 'customer', 'Sample order', ?)").run(id, createdAt.toISOString());
      if (status !== "SUBMITTED") {
        d.prepare("INSERT INTO order_events (order_id, type, from_status, to_status, actor, at) VALUES (?, 'confirm', 'SUBMITTED', 'CONFIRMED', 'owner', ?)")
          .run(id, new Date(createdAt.getTime() + (4 + rand(20)) * 60000).toISOString());
      }
    };
    // Past three weeks of finished orders for reports.
    for (let back = 21; back >= 1; back--) {
      const date = addDays(klDateKey(now), -back);
      if (new Date(`${date}T00:00:00Z`).getUTCDay() === 0) continue;
      const n = 3 + rand(5);
      for (let i = 0; i < n; i++) {
        const noShow = rand(30) === 0;
        make(date, noShow ? "NO_SHOW" : "COMPLETED", noShow ? "UNSETTLED" : "SETTLED", new Date(Date.parse(`${addDays(date, -1)}T12:00:00Z`) + rand(480) * 60000));
      }
    }
    // The day the kitchen is working on: confirmed orders ready for prep and routes.
    for (let i = 0; i < 11; i++) {
      make(serviceDay, "CONFIRMED", "UNSETTLED", new Date(now.getTime() - (60 + rand(600)) * 60000));
    }
    // The next bookable day: a few orders still waiting for their WhatsApp message.
    if (nextBookable) {
      for (let i = 0; i < 3; i++) make(nextBookable, "SUBMITTED", "UNSETTLED", new Date(now.getTime() - (5 + rand(60)) * 60000));
    }
  });
}
