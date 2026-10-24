import "server-only";

/** Public portfolio demo: FIELDCUT_DEMO=1. */
export function isDemo(): boolean {
  const v = process.env.FIELDCUT_DEMO;
  return v === "1" || v === "true";
}

/** Password a public demo falls back to when CONSOLE_PASSWORD is not set. It is shown on the sign-in page. */
export const DEMO_CONSOLE_PASSWORD = "fieldcut";
