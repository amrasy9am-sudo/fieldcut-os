import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Where the SQLite database and generated secrets live.
 * Locally this is apps/web/.data; in production point FIELDCUT_DATA_DIR at a persistent volume.
 */
export function dataDir(): string {
  const dir = process.env.FIELDCUT_DATA_DIR || path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
