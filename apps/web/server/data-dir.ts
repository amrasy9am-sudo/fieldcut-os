import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Where the SQLite database and generated secrets live.
 * Locally this is apps/web/.data; in production point FIELDCUT_DATA_DIR at a persistent volume.
 * On Vercel only /tmp is writable, so the demo keeps its database there (it resets with the instance).
 */
export function dataDir(): string {
  const fallback = process.env.VERCEL ? path.join(os.tmpdir(), "fieldcut") : path.join(process.cwd(), ".data");
  const dir = process.env.FIELDCUT_DATA_DIR || fallback;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
