import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { bytesToCode, canonicalJSON } from "@fieldcut/core";

const DEV_SECRET = "dev-only-secret-do-not-use-in-production";

export function signingSecret(): string {
  const s = process.env.ORDER_SIGNING_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ORDER_SIGNING_SECRET must be set (16+ characters) in production.");
  }
  return DEV_SECRET;
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
