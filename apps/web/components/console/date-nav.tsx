import Link from "next/link";
import { addDays, formatDateShort, type DateKey } from "@fieldcut/core";

/** Previous / next day links that keep the current page, e.g. /console/orders?date=2026-11-03 */
export function DateNav({ path, date, extra = "" }: { path: string; date: DateKey; extra?: string }) {
  const link = (d: DateKey) => `${path}?date=${d}${extra}`;
  return (
    <div className="inline-flex h-9 items-center overflow-hidden rounded-lg border border-line bg-white text-sm font-bold">
      <Link href={link(addDays(date, -1))} className="px-3 hover:bg-oat" aria-label="Previous day">‹</Link>
      <span className="px-2">{formatDateShort(date)}</span>
      <Link href={link(addDays(date, 1))} className="px-3 hover:bg-oat" aria-label="Next day">›</Link>
    </div>
  );
}
