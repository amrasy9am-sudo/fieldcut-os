"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { isBowlSlug, isDateKey, nextBookableDate, type OrderEvent } from "@fieldcut/core";
import { consolePassword, endSession, requireOwner, startSession } from "@/server/auth";
import {
  applyEvent, checkVerifyCode, clearDemoData, closedDates, lockDate, loadDemoData, setCapacityOverride, setClosed, setSettlement,
  updateMenuItem, updateSlot,
} from "@/server/repo";
import { serviceDate } from "@/server/service-date";
import { safeEqual } from "@/server/verify";

export type ConsoleState = { error?: string; ok?: string } | null;

function text(form: FormData, key: string, max = 100): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

export async function loginAction(_prev: ConsoleState, form: FormData): Promise<ConsoleState> {
  const expected = consolePassword();
  if (!expected) return { error: "The console password isn't set. Add CONSOLE_PASSWORD to the server environment." };
  const typed = text(form, "password", 200);
  // Small fixed delay makes password guessing slower.
  await new Promise((r) => setTimeout(r, 400));
  if (!safeEqual(typed, expected)) return { error: "That password isn't right." };
  await startSession(new Date());
  const next = text(form, "next", 200);
  redirect(next.startsWith("/console") ? next : "/console");
}

export async function logoutAction() {
  await endSession();
  redirect("/console/login");
}

const OWNER_EVENTS: OrderEvent[] = ["cancel", "lock", "pack", "dispatch", "ready", "complete", "no_show"];

export async function advanceOrderAction(form: FormData) {
  await requireOwner();
  const ref = text(form, "ref", 30);
  const event = text(form, "event", 20) as OrderEvent;
  if (!OWNER_EVENTS.includes(event)) return;
  applyEvent(ref, event, "owner", new Date(), text(form, "note", 160) || undefined);
  if (event === "complete" && text(form, "settle") === "1") setSettlement(ref, "SETTLED", new Date());
  refresh();
}

export async function confirmOrderAction(_prev: ConsoleState, form: FormData): Promise<ConsoleState> {
  await requireOwner();
  const ref = text(form, "ref", 30);
  const code = text(form, "code", 20);
  const override = text(form, "override") === "1";
  const check = checkVerifyCode(ref, code);
  if (!check.matches && !override) {
    return { error: "The verify code doesn't match this order. The message may have been edited — call the customer before confirming." };
  }
  const r = applyEvent(ref, "confirm", "owner", new Date(), check.matches ? "Verify code matched" : "Confirmed without code match (owner override)");
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: r.affected > 1 ? `Confirmed ${r.affected} plan days.` : "Order confirmed." };
}

export async function settlementAction(form: FormData) {
  await requireOwner();
  const value = text(form, "settlement");
  if (value !== "SETTLED" && value !== "UNSETTLED" && value !== "WAIVED") return;
  setSettlement(text(form, "ref", 30), value, new Date());
  refresh();
}

export async function lockDateAction(form: FormData) {
  await requireOwner();
  const date = text(form, "date", 10);
  if (!isDateKey(date)) return;
  lockDate(date, "owner", new Date());
  refresh();
}

export async function updateMenuAction(_prev: ConsoleState, form: FormData): Promise<ConsoleState> {
  await requireOwner();
  const slug = text(form, "slug", 40);
  if (!isBowlSlug(slug)) return { error: "Unknown bowl." };
  const price = Math.round(Number(text(form, "price", 10)) * 100);
  if (!Number.isFinite(price) || price < 500 || price > 10000) return { error: "Price must be between RM5 and RM100." };
  updateMenuItem(slug, price, text(form, "active") === "on");
  refresh();
  return { ok: "Saved." };
}

export async function updateSlotAction(form: FormData) {
  await requireOwner();
  const id = Number(text(form, "id"));
  const capacity = Number(text(form, "capacity"));
  if (!Number.isInteger(id) || !Number.isInteger(capacity) || capacity < 0 || capacity > 200) return;
  updateSlot(id, capacity, text(form, "active") === "on");
  refresh();
}

export async function capacityOverrideAction(form: FormData) {
  await requireOwner();
  const date = text(form, "date", 10);
  const slotId = Number(text(form, "slot"));
  const raw = text(form, "capacity", 5);
  if (!isDateKey(date) || !Number.isInteger(slotId)) return;
  const capacity = raw === "" ? null : Number(raw);
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 0 || capacity > 200)) return;
  setCapacityOverride(date, slotId, capacity);
  refresh();
}

export async function closedDateAction(form: FormData) {
  await requireOwner();
  const date = text(form, "date", 10);
  if (!isDateKey(date)) return;
  setClosed(date, text(form, "closed") === "1", text(form, "reason", 80) || undefined);
  refresh();
}

export async function demoDataAction(form: FormData) {
  await requireOwner();
  if (text(form, "mode") === "clear") clearDemoData();
  else {
    const now = new Date();
    loadDemoData(now, serviceDate(now), nextBookableDate(now, closedDates()));
  }
  refresh();
}
