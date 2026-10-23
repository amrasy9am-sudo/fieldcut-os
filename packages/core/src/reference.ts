import type { DateKey } from "./time.ts";

/** Crockford base-32: no I, L, O or U, so references are easy to read out over the phone. */
export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function checkChar(payload: string): string {
  // Weighted sum with odd weights: any single-character typo changes the check character.
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    const v = CROCKFORD.indexOf(payload[i]);
    sum += v * (2 * i + 1);
  }
  return CROCKFORD[sum % 32];
}

/** Builds "FC-YYMMDD-XXXXC" for an order date, where C is a check character. */
export function makeRef(date: DateKey, random4: string): string {
  if (!/^[0-9A-HJKMNP-TV-Z]{4}$/.test(random4)) throw new Error("random part must be 4 Crockford characters");
  const yymmdd = date.slice(2).replaceAll("-", "");
  return `FC-${yymmdd}-${random4}${checkChar(yymmdd + random4)}`;
}

export function randomRefBody(): string {
  const bytes = new Uint8Array(4);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CROCKFORD[2 + (b % 30)]).join(""); // skip 0 and 1
}

export function normalizeRef(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[\s_]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
    .replace(/^FC-?(\d{6})-?/, "FC-$1-");
}

export function isValidRef(ref: string): boolean {
  const m = /^FC-(\d{6})-([0-9A-HJKMNP-TV-Z]{4})([0-9A-HJKMNP-TV-Z])$/.exec(ref);
  if (!m) return false;
  return checkChar(m[1] + m[2]) === m[3];
}

/** Short form used in tracking links: the last 5 characters. */
export function shortRef(ref: string): string {
  return ref.slice(-5);
}
