import Link from "next/link";
import { formatDateShort, nextBookableDate } from "@fieldcut/core";
import { requestNow } from "@/server/clock";
import { availabilityFor, closedDates } from "@/server/repo";
import { Skeleton } from "./ui";

/** Tomorrow's real kitchen capacity — honest scarcity straight from the database. */
export async function SlotStrip() {
  const now = await requestNow();
  const date = nextBookableDate(now, closedDates());
  if (!date) return null;
  const slots = availabilityFor(date);
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-mist p-4 md:flex-row md:items-center">
      <div className="md:w-48">
        <p className="font-extrabold">Next service · {formatDateShort(date)}</p>
        <p className="text-xs text-muted">Live kitchen capacity</p>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
        {slots.map((s) => {
          const used = s.capacity ? ((s.capacity - s.left) / s.capacity) * 100 : 100;
          return (
            <Link key={s.slotId} href="/#menu" className="rounded-xl border border-line bg-white p-3">
              <p className="font-mono text-sm font-bold">{s.label}</p>
              <div className="my-2 h-1.5 rounded-full bg-mist">
                <div
                  className={`h-1.5 rounded-full ${s.state === "full" ? "bg-[#C9C2B3]" : s.state === "low" ? "bg-dawn" : "bg-sprout"}`}
                  style={{ width: `${Math.max(4, used)}%` }}
                />
              </div>
              <p className={`text-xs font-bold ${s.state === "full" ? "text-muted" : s.state === "low" ? "text-[#9A5410]" : "text-field"}`}>
                {s.state === "full" ? "Full" : `${s.left} bowl${s.left === 1 ? "" : "s"} left`}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SlotStripSkeleton() {
  return <Skeleton className="h-28" />;
}
