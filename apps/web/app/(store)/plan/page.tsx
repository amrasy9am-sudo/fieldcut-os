import type { Metadata } from "next";
import { Suspense } from "react";
import { addDays, isBookable, nextWeekMonday, PLAN_WINDOW_DAYS } from "@fieldcut/core";
import { PlanForm } from "@/components/plan-form";
import { Eyebrow, Skeleton } from "@/components/ui";
import { requestNow } from "@/server/clock";
import { availabilityFor, closedDates, getMenu } from "@/server/repo";

export const metadata: Metadata = { title: "Five-day plan · Fieldcut" };

async function Plan() {
  const now = await requestNow();
  const monday = nextWeekMonday(now);
  const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
  const closed = closedDates();
  const blocked = days.filter((d) => !isBookable(d, now, closed, PLAN_WINDOW_DAYS));
  const perDay = days.map((d) => availabilityFor(d));
  const slots = perDay[0].map((s) => ({
    slotId: s.slotId,
    label: s.label,
    minLeft: Math.min(...perDay.map((day) => day.find((x) => x.slotId === s.slotId)?.left ?? 0)),
  }));
  const menu = getMenu();
  return (
    <PlanForm
      days={days}
      slots={slots}
      soldOut={menu.filter((b) => !b.active).map((b) => b.slug)}
      unavailable={blocked.length ? "The kitchen is closed on one of next week's days, so plans are paused this week. Order day by day instead." : null}
    />
  );
}

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Eyebrow>Five-day plan</Eyebrow>
      <h1 className="mt-1 font-display text-4xl font-semibold">RM72 for next week&apos;s lunches</h1>
      <p className="mt-1 max-w-2xl text-muted">
        One bowl a day, Monday to Friday. Pick each day&apos;s bowl; salmon days are +RM8. Free delivery in Zones A &amp; B, RM2 a day in Zone C.
        Cancel before 22:00 the night before the first day.
      </p>
      <div className="mt-6">
        <Suspense fallback={<Skeleton className="h-[600px]" />}>
          <Plan />
        </Suspense>
      </div>
    </div>
  );
}
