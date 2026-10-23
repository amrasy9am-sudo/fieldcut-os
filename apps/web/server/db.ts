import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { BOWLS, DEFAULT_SLOTS } from "@fieldcut/core";

/**
 * Embedded SQLite through Node's built-in node:sqlite driver: zero setup for local development.
 * The driver is synchronous, so a transaction can never interleave with another request —
 * that is what makes slot reservations atomic (see docs/adr/005-capacity-reservation.md).
 */
const SCHEMA_VERSION = 1;

const MIGRATION_1 = `
CREATE TABLE IF NOT EXISTS menu_items (
  slug TEXT PRIMARY KEY,
  price_sen INTEGER NOT NULL CHECK (price_sen > 0),
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  default_capacity INTEGER NOT NULL CHECK (default_capacity >= 0),
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS slot_overrides (
  date TEXT NOT NULL,
  slot_id INTEGER NOT NULL REFERENCES slots(id),
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  PRIMARY KEY (date, slot_id)
);
CREATE TABLE IF NOT EXISTS closed_dates (
  date TEXT PRIMARY KEY,
  reason TEXT
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  plan_ref TEXT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  slot_date TEXT NOT NULL,
  slot_id INTEGER NOT NULL REFERENCES slots(id),
  mode TEXT NOT NULL CHECK (mode IN ('delivery','pickup')),
  zone TEXT,
  area TEXT,
  address TEXT,
  notes TEXT,
  status TEXT NOT NULL,
  settlement TEXT NOT NULL DEFAULT 'UNSETTLED' CHECK (settlement IN ('UNSETTLED','SETTLED','WAIVED')),
  settlement_method TEXT NOT NULL,
  subtotal_sen INTEGER NOT NULL,
  delivery_sen INTEGER NOT NULL,
  total_sen INTEGER NOT NULL,
  bowls INTEGER NOT NULL CHECK (bowls > 0),
  verify_code TEXT NOT NULL,
  idem_key TEXT UNIQUE,
  hold_expires_at TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_date_status ON orders (slot_date, status);
CREATE INDEX IF NOT EXISTS orders_customer ON orders (customer_id, created_at);
CREATE INDEX IF NOT EXISTS orders_plan ON orders (plan_ref);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  dressing TEXT NOT NULL,
  add_ons TEXT NOT NULL,
  leave_out TEXT NOT NULL,
  detail TEXT NOT NULL,
  unit_sen INTEGER NOT NULL,
  line_sen INTEGER NOT NULL,
  kcal INTEGER NOT NULL,
  protein_g INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS order_items_order ON order_items (order_id);
CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor TEXT NOT NULL,
  note TEXT,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS order_events_order ON order_events (order_id, id);
`;

function open(): DatabaseSync {
  const sqlite = process.getBuiltinModule("node:sqlite");
  const dir = path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new sqlite.DatabaseSync(path.join(dir, "fieldcut.db"));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  const version = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  if (version < SCHEMA_VERSION) {
    db.exec(MIGRATION_1);
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
  seed(db);
  return db;
}

function seed(db: DatabaseSync) {
  const insertMenu = db.prepare("INSERT OR IGNORE INTO menu_items (slug, price_sen, active) VALUES (?, ?, 1)");
  for (const b of BOWLS) insertMenu.run(b.slug, b.priceSen);
  const insertSlot = db.prepare(
    "INSERT OR IGNORE INTO slots (id, label, start_time, end_time, default_capacity, active) VALUES (?, ?, ?, ?, ?, ?)",
  );
  for (const s of DEFAULT_SLOTS) insertSlot.run(s.id, s.label, s.start, s.end, s.defaultCapacity, s.active ? 1 : 0);
}

const globalForDb = globalThis as unknown as { __fieldcutDb?: DatabaseSync };

/** One connection per server process (survives hot reloads in development). */
export function db(): DatabaseSync {
  globalForDb.__fieldcutDb ??= open();
  return globalForDb.__fieldcutDb;
}

/** Runs fn inside a write transaction (BEGIN IMMEDIATE takes the write lock up front). */
export function tx<T>(fn: (d: DatabaseSync) => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const out = fn(d);
    d.exec("COMMIT");
    return out;
  } catch (err) {
    d.exec("ROLLBACK");
    throw err;
  }
}
