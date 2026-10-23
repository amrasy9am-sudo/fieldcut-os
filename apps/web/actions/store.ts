"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { isBowlSlug, isDateKey, lastFour, normalizeMyPhone, normalizeRef, parseLine, type BowlSlug, type LineInput } from "@fieldcut/core";
import { canTrack, grantTracking } from "@/server/auth";
import { applyEvent, createOrder, getOrder, type CreateResult, type SettlementMethod } from "@/server/repo";

export type PlaceOrderState = { error?: string; field?: string; ref?: string } | null;

/** Unexpected failures are logged on the server and shown to the customer as a friendly message. */
function safely(fn: () => CreateResult): CreateResult {
  try {
    return fn();
  } catch (err) {
    console.error("[fieldcut] order failed", err);
    return { ok: false, code: "INVALID", error: "Sorry — something went wrong on our side. Please try again, or message us on WhatsApp." };
  }
}

function text(form: FormData, key: string, max = 200): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function readCustomer(form: FormData): { error: string; field: string } | {
  name: string; phone: string; mode: "delivery" | "pickup"; areaId: string | null; address: string | null; notes: string | null; settlement: SettlementMethod; slotId: number; idemKey: string;
} {
  const name = text(form, "name", 60);
  if (name.length < 2) return { error: "Please enter your name.", field: "name" };
  const phone = normalizeMyPhone(text(form, "phone", 20));
  if (!phone) return { error: "Please enter a Malaysian mobile number, e.g. 012-345 6789.", field: "phone" };
  const mode = text(form, "mode") === "pickup" ? "pickup" : "delivery";
  const areaId = mode === "delivery" ? text(form, "area", 40) || null : null;
  const address = mode === "delivery" ? text(form, "address", 200) || null : null;
  if (mode === "delivery" && !areaId) return { error: "Choose your delivery area.", field: "area" };
  if (mode === "delivery" && (!address || address.length < 8)) return { error: "Please enter your full delivery address.", field: "address" };
  const settlementRaw = text(form, "settlement");
  const settlement: SettlementMethod = settlementRaw === "arranged" ? "arranged" : mode === "pickup" ? "pickup" : "cod";
  const slotId = Number(text(form, "slot"));
  if (!Number.isInteger(slotId) || slotId < 1) return { error: "Choose a delivery slot.", field: "slot" };
  const idemKey = text(form, "idem", 64);
  if (idemKey.length < 8) return { error: "Something went wrong. Please refresh the page and try again.", field: "form" };
  return { name, phone, mode, areaId, address, notes: text(form, "notes", 160) || null, settlement, slotId, idemKey };
}

export async function placeOrderAction(_prev: PlaceOrderState, form: FormData): Promise<PlaceOrderState> {
  const customer = readCustomer(form);
  if ("error" in customer) return customer;
  const date = text(form, "date", 10);
  if (!isDateKey(date)) return { error: "Choose a delivery date.", field: "date" };

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("cart") ?? "[]"));
  } catch {
    return { error: "Your bag couldn't be read. Please refresh the page.", field: "form" };
  }
  if (!Array.isArray(raw) || raw.length === 0) return { error: "Your bag is empty.", field: "form" };
  const lines: LineInput[] = [];
  for (const item of raw) {
    const parsed = parseLine(item);
    if (!parsed.ok) return { error: parsed.error, field: "form" };
    lines.push(parsed.value);
  }

  const result = safely(() => createOrder({ kind: "order", ...customer, date, lines, now: new Date() }));
  if (!result.ok) return { error: result.error, field: result.code === "SLOT_FULL" || result.code === "CUTOFF_PASSED" ? "slot" : "form" };
  await grantTracking(result.ref);
  return { ref: result.ref };
}

export async function placePlanAction(_prev: PlaceOrderState, form: FormData): Promise<PlaceOrderState> {
  const customer = readCustomer(form);
  if ("error" in customer) return customer;
  const days: { date: string; slug: BowlSlug }[] = [];
  for (let i = 0; i < 5; i++) {
    const date = text(form, `day${i}_date`, 10);
    const slug = text(form, `day${i}_bowl`, 40);
    if (!isDateKey(date) || !isBowlSlug(slug)) return { error: "Pick a bowl for each of the five days.", field: "days" };
    days.push({ date, slug });
  }
  const result = safely(() => createOrder({ kind: "plan", ...customer, days, now: new Date() }));
  if (!result.ok) return { error: result.error, field: result.code === "SLOT_FULL" || result.code === "CUTOFF_PASSED" ? "slot" : "form" };
  await grantTracking(result.ref);
  return { ref: result.ref };
}

export type TrackState = { error?: string } | null;

/** Customers prove an order is theirs with the last four digits of the phone number on it. */
export async function trackAction(_prev: TrackState, form: FormData): Promise<TrackState> {
  const ref = normalizeRef(text(form, "ref", 30));
  const digits = text(form, "last4", 8).replace(/\D/g, "");
  const order = getOrder(ref);
  if (!order || digits.length !== 4 || lastFour(order.phone) !== digits) {
    return { error: "We couldn't find an order with that reference and phone number." };
  }
  await grantTracking(order.planRef ?? order.ref);
  if (order.planRef) await grantTracking(order.ref);
  redirect(`/t/${order.planRef ?? order.ref}`);
}

export async function cancelOrderAction(form: FormData) {
  const ref = normalizeRef(text(form, "ref", 30));
  if (!(await canTrack(ref))) return;
  applyEvent(ref, "cancel", "customer", new Date(), "Cancelled by customer");
  refresh();
}
