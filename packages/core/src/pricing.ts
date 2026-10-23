import {
  ADDONS, DRESSINGS, getBowl, isAddOnId, isBowlSlug, isDressingCode, isLeaveOutId, LEAVE_OUTS,
  type AddOnId, type BowlSlug, type DressingCode, type LeaveOutId,
} from "./catalog.ts";
import type { Sen } from "./money.ts";
import { MIN_DELIVERY_SUBTOTAL_SEN, ZONES, type ZoneCode } from "./zones.ts";

export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES = 12;

export type LineInput = {
  slug: BowlSlug;
  qty: number;
  dressing: DressingCode;
  addOns: Partial<Record<AddOnId, number>>;
  leaveOut: LeaveOutId[];
};

export type PricedLine = LineInput & {
  name: string;
  unitSen: Sen;
  lineSen: Sen;
  kcal: number;
  proteinG: number;
  detail: string;
};

export type PriceOverrides = Partial<Record<BowlSlug, Sen>>;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validates untrusted input (from a form or the browser) into a LineInput. */
export function parseLine(raw: unknown): Result<LineInput> {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Invalid item." };
  const r = raw as Record<string, unknown>;
  const slug = String(r.slug ?? "");
  if (!isBowlSlug(slug)) return { ok: false, error: "Unknown bowl." };
  const qty = Number(r.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
    return { ok: false, error: `Quantity must be 1–${MAX_QTY_PER_LINE}.` };
  }
  const dressing = String(r.dressing ?? "");
  if (!isDressingCode(dressing)) return { ok: false, error: "Unknown dressing." };
  const addOns: Partial<Record<AddOnId, number>> = {};
  const rawAddOns = (r.addOns ?? {}) as Record<string, unknown>;
  for (const [id, n] of Object.entries(rawAddOns)) {
    if (!isAddOnId(id)) return { ok: false, error: "Unknown add-on." };
    const count = Number(n);
    if (!Number.isInteger(count) || count < 0 || count > ADDONS[id].maxQty) {
      return { ok: false, error: `Too many of ${ADDONS[id].name}.` };
    }
    if (count > 0) addOns[id] = count;
  }
  const leaveOut: LeaveOutId[] = [];
  for (const id of Array.isArray(r.leaveOut) ? r.leaveOut : []) {
    const s = String(id);
    if (!isLeaveOutId(s)) return { ok: false, error: "Unknown leave-out." };
    if (!leaveOut.includes(s)) leaveOut.push(s);
  }
  return { ok: true, value: { slug, qty, dressing, addOns, leaveOut } };
}

export function describeLine(line: LineInput): string {
  const bowl = getBowl(line.slug)!;
  const parts: string[] = [DRESSINGS[line.dressing].name];
  if (line.dressing !== bowl.dressing) parts[0] += " (swapped)";
  for (const [id, n] of Object.entries(line.addOns) as [AddOnId, number][]) {
    parts.push(`+${ADDONS[id].name.split(" · ")[0].replace("Extra ", "")}${n > 1 ? ` ×${n}` : ""}`);
  }
  if (line.leaveOut.length) {
    parts.push(`no ${line.leaveOut.map((id) => LEAVE_OUTS.find((l) => l.id === id)!.name.toLowerCase()).join(", ")}`);
  }
  return parts.join(" · ");
}

export function priceLine(line: LineInput, overrides: PriceOverrides = {}): PricedLine {
  const bowl = getBowl(line.slug);
  if (!bowl) throw new Error(`Unknown bowl ${line.slug}`);
  const base = overrides[line.slug] ?? bowl.priceSen;
  let unitSen = base;
  let kcal = bowl.kcal - DRESSINGS[bowl.dressing].kcal + DRESSINGS[line.dressing].kcal;
  let proteinG = bowl.proteinG;
  for (const [id, n] of Object.entries(line.addOns) as [AddOnId, number][]) {
    const a = ADDONS[id];
    unitSen += a.priceSen * n;
    kcal += (id === "extra-dressing" ? DRESSINGS[line.dressing].kcal : a.kcal) * n;
    proteinG += a.proteinG * n;
  }
  return {
    ...line,
    name: bowl.name,
    unitSen,
    lineSen: unitSen * line.qty,
    kcal,
    proteinG,
    detail: describeLine(line),
  };
}

export type FulfilmentMode = "delivery" | "pickup";

export type Quote = {
  lines: PricedLine[];
  bowls: number;
  subtotalSen: Sen;
  deliverySen: Sen;
  totalSen: Sen;
  problems: string[];
};

export function quoteOrder(input: {
  lines: LineInput[];
  mode: FulfilmentMode;
  zone: ZoneCode | null;
  overrides?: PriceOverrides;
}): Quote {
  const lines = input.lines.map((l) => priceLine(l, input.overrides));
  const subtotalSen = lines.reduce((s, l) => s + l.lineSen, 0);
  const bowls = lines.reduce((s, l) => s + l.qty, 0);
  const problems: string[] = [];
  let deliverySen = 0;
  if (lines.length === 0) problems.push("Your bag is empty.");
  if (lines.length > MAX_LINES) problems.push(`At most ${MAX_LINES} different items per order.`);
  if (input.mode === "delivery") {
    if (input.zone === null) {
      problems.push("This area is outside our 8 km delivery radius — please choose self pick-up.");
    } else {
      deliverySen = ZONES[input.zone].feeSen;
      if (subtotalSen < MIN_DELIVERY_SUBTOTAL_SEN) {
        problems.push("Delivery needs a minimum of RM25 in food. Add a bowl or choose pick-up.");
      }
    }
  }
  return { lines, bowls, subtotalSen, deliverySen, totalSen: subtotalSen + deliverySen, problems };
}

/** Five-day plan: RM72 for five bowls, salmon days +RM8, add-ons not included. */
export const PLAN_PRICE_PER_BOWL_SEN: Sen = 1440;
export const PLAN_SALMON_SURCHARGE_SEN: Sen = 800;

export function planBowlPriceSen(slug: BowlSlug): Sen {
  return PLAN_PRICE_PER_BOWL_SEN + (slug === "harbour-salmon" ? PLAN_SALMON_SURCHARGE_SEN : 0);
}
