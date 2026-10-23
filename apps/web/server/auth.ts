import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hmac, safeEqual } from "./verify";

const SESSION_COOKIE = "fc_console";
const SESSION_HOURS = 12;

/** The console password. A development default exists so the demo works out of the box. */
export function consolePassword(): string | null {
  const p = process.env.CONSOLE_PASSWORD;
  if (p && p.length >= 6) return p;
  return process.env.NODE_ENV === "production" ? null : "fieldcut";
}

export function usingDevPassword(): boolean {
  return !process.env.CONSOLE_PASSWORD && process.env.NODE_ENV !== "production";
}

function token(expiresAt: number): string {
  const payload = `owner.${expiresAt}`;
  return `${payload}.${hmac(`session:${payload}`)}`;
}

export async function startSession(now: Date) {
  const expiresAt = now.getTime() + SESSION_HOURS * 3600_000;
  (await cookies()).set(SESSION_COOKIE, token(expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isOwner(): Promise<boolean> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  // Session expiry depends on the current time, so this must only run at request time.
  await connection();
  if (!value) return false;
  const [role, exp, sig] = value.split(".");
  if (role !== "owner" || !exp || !sig) return false;
  if (!safeEqual(sig, hmac(`session:${role}.${exp}`))) return false;
  return Number(exp) > Date.now();
}

/** Every console page and console Server Action calls this first. */
export async function requireOwner() {
  if (!(await isOwner())) redirect("/console/login");
}

/* ---------------------------------------------------------------- order tracking access */

const trackCookie = (ref: string) => `fc_t_${ref.replaceAll("-", "")}`;

/** Remembers on this device that the customer proved they own an order (phone last 4 digits). */
export async function grantTracking(ref: string) {
  (await cookies()).set(trackCookie(ref), hmac(`track:${ref}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function canTrack(ref: string): Promise<boolean> {
  const v = (await cookies()).get(trackCookie(ref))?.value;
  return Boolean(v && safeEqual(v, hmac(`track:${ref}`))) || (await isOwner());
}
