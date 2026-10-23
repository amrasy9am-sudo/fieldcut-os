"use client";

import { useSyncExternalStore } from "react";
import { parseLine, type LineInput } from "@fieldcut/core";

/**
 * The bag lives in localStorage on the customer's device. It only holds choices (bowl, dressing,
 * add-ons) — never prices. Prices are always recomputed on the server when the order is placed.
 */
export type CartLine = LineInput & { key: string };

const KEY = "fieldcut.bag.v1";
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;
const EMPTY: CartLine[] = [];

function newKey() {
  return Math.random().toString(36).slice(2, 10);
}

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(raw)
      ? raw.flatMap((r) => {
          const p = parseLine(r);
          return p.ok ? [{ ...p.value, key: String((r as { key?: string }).key ?? newKey()) }] : [];
        })
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // Private mode or storage blocked: the bag still works for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

function sameChoice(a: LineInput, b: LineInput) {
  return (
    a.slug === b.slug &&
    a.dressing === b.dressing &&
    JSON.stringify(a.addOns) === JSON.stringify(b.addOns) &&
    JSON.stringify([...a.leaveOut].sort()) === JSON.stringify([...b.leaveOut].sort())
  );
}

export const cart = {
  add(line: LineInput) {
    const lines = read();
    const same = lines.find((l) => sameChoice(l, line));
    if (same) write(lines.map((l) => (l === same ? { ...l, qty: Math.min(10, l.qty + line.qty) } : l)));
    else write([...lines, { ...line, key: newKey() }]);
  },
  setQty(key: string, qty: number) {
    write(qty <= 0 ? read().filter((l) => l.key !== key) : read().map((l) => (l.key === key ? { ...l, qty: Math.min(10, qty) } : l)));
  },
  clear() {
    write([]);
  },
};

/* ---------------------------------------------------------------- remembered details */

export type SavedDetails = { name: string; phone: string; mode: "delivery" | "pickup"; area: string; address: string };
const DETAILS_KEY = "fieldcut.details.v1";

export function loadDetails(): Partial<SavedDetails> {
  try {
    return JSON.parse(window.localStorage.getItem(DETAILS_KEY) ?? "{}") as Partial<SavedDetails>;
  } catch {
    return {};
  }
}

export function saveDetails(d: SavedDetails) {
  try {
    window.localStorage.setItem(DETAILS_KEY, JSON.stringify(d));
  } catch {
    // ignore
  }
}

export function newIdempotencyKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
