import { Suspense } from "react";
import { addDays, CUTOFF_TIME, formatDateShort, HOLD_SWEEP_TIME, isOperatingDay, klDateKey } from "@fieldcut/core";
import { capacityOverrideAction, closedDateAction, updateSlotAction } from "@/actions/console";
import { PageHeader } from "@/components/console/page-header";
import { buttonStyles, Card, cx, Skeleton } from "@/components/ui";
import { requireOwner } from "@/server/auth";
import { requestNow } from "@/server/clock";
import { availabilityFor, closedDates, getSlotDefs, listClosedDates } from "@/server/repo";

async function Capacity() {
  await requireOwner();
  const now = await requestNow();
  const today = klDateKey(now);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const closed = closedDates();
  const slots = getSlotDefs();
  const active = slots.filter((s) => s.active);

  return (
    <>
      <PageHeader title="Capacity & calendar" sub="Capacity is in bowls. The storefront can never sell more than these numbers." />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-bold">Default slots</h2>
            <div className="mt-2 divide-y divide-line">
              {slots.map((s) => (
                <form key={s.id} action={updateSlotAction} className="flex items-center gap-3 py-2.5 text-sm">
                  <input type="hidden" name="id" value={s.id} />
                  <span className="w-28 font-mono font-bold">{s.label}</span>
                  <input name="capacity" type="number" min={0} max={200} defaultValue={s.defaultCapacity} aria-label={`${s.label} capacity`}
                    className="h-9 w-20 rounded-lg border border-line px-2 font-mono" />
                  <label className="flex items-center gap-1.5 text-xs font-bold"><input type="checkbox" name="active" defaultChecked={s.active} className="accent-[#2E5B3B]" /> Open</label>
                  <button className={cx(buttonStyles.small, "ml-auto bg-loam text-white")}>Save</button>
                </form>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Solo: about 35 bowls a day. With the part-time helper: 70+. The 17:30 slot is for Ramadan.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">Rules</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted">Order cut-off</dt><dd className="font-mono font-bold">{CUTOFF_TIME} night before</dd>
              <dt className="text-muted">Unconfirmed holds expire</dt><dd className="font-mono font-bold">{HOLD_SWEEP_TIME}</dd>
              <dt className="text-muted">Operating days</dt><dd className="font-bold">Mon–Sat</dd>
              <dt className="text-muted">Book ahead</dt><dd className="font-bold">7 days (plans 14)</dd>
              <dt className="text-muted">Delivery minimum</dt><dd className="font-bold">RM25</dd>
            </dl>
            <p className="mt-3 text-xs text-muted">Closed dates</p>
            <ul className="mt-1 space-y-1 text-sm">
              {listClosedDates().map((c) => <li key={c.date}>{formatDateShort(c.date)}{c.reason && ` · ${c.reason}`}</li>)}
              {listClosedDates().length === 0 && <li className="text-muted">None</li>}
            </ul>
          </Card>
        </div>

        <Card className="overflow-x-auto p-5">
          <h2 className="font-bold">Next 14 days</h2>
          <table className="mt-3 w-full min-w-[560px] text-sm">
            <thead className="text-left text-[10px] uppercase tracking-wider text-muted">
              <tr><th className="pb-2">Day</th>{active.map((s) => <th key={s.id} className="pb-2">{s.label}</th>)}<th className="pb-2" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {days.map((d) => {
                const isClosed = !isOperatingDay(d) || closed.has(d);
                const avail = availabilityFor(d);
                return (
                  <tr key={d} className={isClosed ? "text-muted" : ""}>
                    <td className="py-2 font-bold">{formatDateShort(d)}</td>
                    {active.map((s) => {
                      const a = avail.find((x) => x.slotId === s.id)!;
                      return (
                        <td key={s.id} className="py-2">
                          {isClosed ? "—" : (
                            <form action={capacityOverrideAction} className="flex items-center gap-1">
                              <input type="hidden" name="date" value={d} />
                              <input type="hidden" name="slot" value={s.id} />
                              <span className="w-12 font-mono text-xs">{a.capacity - a.left}/</span>
                              <input name="capacity" type="number" min={0} max={200} defaultValue={a.capacity} aria-label={`Capacity ${d} ${s.label}`}
                                className={cx("h-8 w-14 rounded-md border px-1 font-mono text-xs", a.overridden ? "border-dawn bg-[#FCE3C6]" : "border-line")} />
                              <button className="text-[10px] font-bold text-field" aria-label="Save capacity">✓</button>
                            </form>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 text-right">
                      {isOperatingDay(d) && (
                        <form action={closedDateAction}>
                          <input type="hidden" name="date" value={d} />
                          <input type="hidden" name="closed" value={closed.has(d) ? "0" : "1"} />
                          <button className={cx(buttonStyles.small, "h-7 border border-line bg-white")}>{closed.has(d) ? "Reopen" : "Close day"}</button>
                        </form>
                      )}
                      {!isOperatingDay(d) && <span className="text-xs">Sunday</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Booked / capacity. Highlighted cells are overridden for that day only.</p>
        </Card>
      </div>
    </>
  );
}

export default function CapacityPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Capacity />
    </Suspense>
  );
}
