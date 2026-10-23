import { cutoffFor, formatDateShort, nextBookableDate } from "@fieldcut/core";
import { requestNow } from "@/server/clock";
import { closedDates } from "@/server/repo";
import { Countdown } from "./countdown";

export async function CutoffChip() {
  const now = await requestNow();
  const next = nextBookableDate(now, closedDates());
  if (!next) return null;
  return (
    <span className="hidden rounded-full bg-[#FCE3C6] px-3 py-1.5 text-xs font-bold text-[#9A5410] md:inline">
      <Countdown until={cutoffFor(next).toISOString()} prefix={`Orders for ${formatDateShort(next)} close`} />
    </span>
  );
}
