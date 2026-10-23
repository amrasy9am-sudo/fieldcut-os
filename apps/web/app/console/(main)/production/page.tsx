import Link from "next/link";
import { Suspense } from "react";
import { DRESSINGS, explode, formatDateShort, formatQty, type DressingCode } from "@fieldcut/core";
import { advanceOrderAction, lockDateAction } from "@/actions/console";
import { BowlCounts } from "@/components/console/bowl-counts";
import { DateNav } from "@/components/console/date-nav";
import { PageHeader } from "@/components/console/page-header";
import { buttonStyles, Card, cx, Skeleton, StatusBadge } from "@/components/ui";
import { requireOwner } from "@/server/auth";
import { requestNow } from "@/server/clock";
import { listOrdersForDate } from "@/server/repo";
import { pickDate, serviceDate } from "@/server/service-date";

const STATION_ORDER = ["Grill", "Oven", "Hob", "Wash & cut", "Cold"];
const STATION_TIME: Record<string, string> = { Grill: "07:30 hot station", Oven: "07:30 hot station", Hob: "07:30 hot station", "Wash & cut": "06:30 veg station", Cold: "Tonight · cold prep" };

async function Production({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireOwner();
  const now = await requestNow();
  const date = pickDate((await searchParams).date, serviceDate(now));
  const orders = listOrdersForDate(date, ["CONFIRMED", "IN_PREP", "PACKED", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "COMPLETED"]);
  const awaiting = listOrdersForDate(date, ["SUBMITTED"]);
  const plan = explode(orders.flatMap((o) => o.items));
  const confirmed = orders.filter((o) => o.status === "CONFIRMED");
  const inPrep = orders.filter((o) => o.status === "IN_PREP");
  const stations = STATION_ORDER.map((s) => ({ s, items: plan.ingredients.filter((i) => i.station === s) })).filter((x) => x.items.length);
  const groups = new Map<string, typeof orders>();
  for (const o of [...orders].reverse()) {
    const key = `${o.slotLabel} · ${o.mode === "delivery" ? `Zone ${o.zone}` : "Pick-up"}`;
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }

  return (
    <>
      <PageHeader title={`Production · ${formatDateShort(date)}`} sub={`${plan.totalBowls} bowls from ${orders.length} confirmed orders${awaiting.length ? ` · ${awaiting.length} still awaiting WhatsApp (not included)` : ""}`}>
        <DateNav path="/console/production" date={date} />
        <Link href={`/console/labels?date=${date}`} className={buttonStyles.ghost}>Print labels</Link>
        {confirmed.length > 0 && (
          <form action={lockDateAction}>
            <input type="hidden" name="date" value={date} />
            <button className={buttonStyles.primary}>Lock day &amp; start prep ({confirmed.length})</button>
          </form>
        )}
      </PageHeader>

      {confirmed.length === 0 && inPrep.length > 0 && (
        <p className="mb-4 rounded-xl bg-field px-4 py-2 text-sm font-bold text-white">🔒 Locked · {inPrep.length} orders in prep. Late changes need a manual order.</p>
      )}

      <BowlCounts counts={plan.bowls} />

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <h2 className="font-bold">Prep list by station</h2>
          <p className="text-xs text-muted">Quantities include a 5% trim allowance. Generated from each bowl&apos;s bill of materials.</p>
          {stations.length === 0 && <p className="mt-4 text-sm text-muted">Nothing to prep yet — confirm orders first.</p>}
          {stations.map(({ s, items }) => (
            <div key={s} className="mt-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-field">{s} · {STATION_TIME[s]}</p>
              <table className="mt-1 w-full text-sm">
                <tbody className="divide-y divide-line">
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className="w-6 py-1.5"><input type="checkbox" aria-label={`Done: ${i.name}`} className="h-4 w-4 accent-[#2E5B3B]" /></td>
                      <td className="py-1.5 font-semibold">{i.name}</td>
                      <td className="py-1.5 text-right font-mono">{formatQty(i)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {plan.totalBowls > 0 && (
            <div className="mt-4 rounded-xl bg-oat p-3 text-xs text-muted">
              Food-safety reminders: chicken to 74 °C core, salmon to 63 °C · cool from 60 °C to 21 °C within 2 hours · fridge 1–4 °C.
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-bold">Dressing cups</h2>
            <ul className="mt-2 space-y-2">
              {(Object.keys(DRESSINGS) as DressingCode[]).map((c) => (
                <li key={c} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-extrabold text-white" style={{ background: DRESSINGS[c].color }}>{c}</span>
                  <span className="flex-1 font-semibold">{DRESSINGS[c].name}</span>
                  <span className="font-mono font-bold">{plan.dressingCups[c]} cups</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold">Packing sequence</h2>
            <p className="text-xs text-muted">Pack in reverse route order so the first drop sits on top.</p>
            <ul className="mt-3 space-y-3">
              {[...groups.entries()].map(([key, list]) => (
                <li key={key}>
                  <p className="flex justify-between text-sm font-bold"><span>{key}</span><span className="font-mono">{list.reduce((s, o) => s + o.bowls, 0)} bowls</span></p>
                  <ul className="mt-1 space-y-1">
                    {list.map((o) => (
                      <li key={o.ref} className="flex items-center justify-between gap-2 rounded-lg bg-oat px-2 py-1.5 text-xs">
                        <span><span className="font-mono font-bold">{o.ref.slice(-5)}</span> · {o.name} · {o.bowls}×</span>
                        {o.status === "IN_PREP" ? (
                          <form action={advanceOrderAction}>
                            <input type="hidden" name="ref" value={o.ref} />
                            <input type="hidden" name="event" value="pack" />
                            <button className={cx(buttonStyles.small, "h-7 bg-loam text-white")}>Packed</button>
                          </form>
                        ) : (
                          <StatusBadge status={o.status} />
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              {groups.size === 0 && <li className="text-sm text-muted">No confirmed orders.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function ProductionPage({ searchParams }: PageProps<"/console/production">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Production searchParams={searchParams} />
    </Suspense>
  );
}
