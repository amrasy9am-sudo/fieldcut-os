import "server-only";
import { connection } from "next/server";
import { expireHolds } from "./repo";

/**
 * Request-time "now". Awaiting connection() keeps database reads out of the prerendered shell,
 * and running the hold sweep here means expired holds are released even without a cron job.
 */
export async function requestNow(): Promise<Date> {
  await connection();
  const now = new Date();
  expireHolds(now);
  return now;
}
