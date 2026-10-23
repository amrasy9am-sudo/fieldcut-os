/** Normalises a Malaysian mobile number to E.164 (+60…) or returns null when it isn't one. */
export function normalizeMyPhone(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("60")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^1\d{8,9}$/.test(digits)) return null;
  return `+60${digits}`;
}

/** +60123456789 → 012-345 6789 */
export function displayPhone(e164: string): string {
  const local = `0${e164.replace(/^\+60/, "")}`;
  return local.length === 11
    ? `${local.slice(0, 3)}-${local.slice(3, 7)} ${local.slice(7)}`
    : `${local.slice(0, 3)}-${local.slice(3, 6)} ${local.slice(6)}`;
}

/** +60123456789 → 60123456789 (the format wa.me expects) */
export function waNumber(e164: string): string {
  return e164.replace(/^\+/, "");
}

export function lastFour(e164: string): string {
  return e164.slice(-4);
}
