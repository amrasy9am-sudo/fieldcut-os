import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { bytesToCode, canonicalJSON } from "@fieldcut/core";
import { dataDir } from "./data-dir";

const DEV_SECRET = "dev-only-secret-do-not-use-in-production";

let cached: string | undefined;

/**
 * The HMAC key behind verify codes and console sessions.
 * ORDER_SIGNING_SECRET wins when set. In production without it, a random key is generated once
 * and kept beside the database, so codes and sessions survive restarts and redeploys.
 */
export function signingSecret(): string {
  if (cached) return cached;
  const s = process.env.ORDER_SIGNING_SECRET;
  if (s && s.length >= 16) return (cached = s);
  if (process.env.NODE_ENV !== "production") return (cached = DEV_SECRET);

  const file = path.join(dataDir(), "signing.key");
  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing.length >= 32) return (cached = existing);
  } catch {
    // No key yet: create one below.
  }
  const fresh = randomBytes(32).toString("base64url");
  try {
    fs.writeFileSync(file, fresh, { mode: 0o600, flag: "wx" });
    return (cached = fresh);
  } catch {
    // Another worker created it first; use theirs.
    return (cached = fs.readFileSync(file, "utf8").trim());
  }
}

/** HMAC-SHA256 over the order's canonical JSON, shown to people as XXXX-XXXX. */
export function computeVerifyCode(payload: unknown): string {
  const mac = createHmac("sha256", signingSecret()).update(canonicalJSON(payload)).digest();
  return bytesToCode(new Uint8Array(mac));
}

export function hmac(value: string): string {
  return createHmac("sha256", signingSecret()).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function normalizeCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/[IL]/g, "1").replace(/O/g, "0");
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}
