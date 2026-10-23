import Link from "next/link";
import { Suspense } from "react";
import { explode, formatDateShort, formatKlDateTime, formatRM } from "@fieldcut/core";
import { demoDataAction } from "@/actions/console";
import { BowlCounts } from "@/components/console/bowl-counts";
import { Kpi, PageHeader } from "@/components/console/page-header";
import { buttonStyles, Card, cx, Skeleton, StatusBadge, TierBadge } from "@/components/ui";
import { requireOwner } from "@/server/auth";
import { requestNow } from "@/server/clock";
import { availabilityFor, customerStats, dateSummary, hasAnyOrders, listAwaiting, listOrdersForDate, reports } from "@/server/repo";
import { focusDate, serviceDate } from "@/server/service-date";

async function Today() {
  await requireOwner();
  const now = await requestNow();
  const today = serviceDate(now);
  const { date, isNextWithOrders } = focusDate(now);
  const summary = dateSummary(date);
  const slots = availabilityFor(date);
  const capacity = slots.reduce((s, x) => s + x.capacity, 0);
  const awaiting = listAwaiting();
  const orders = listOrdersForDate(date, ["SUBMITTED", "CONFIRMED", "IN_PREP", "PACKED", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "COMPLETED"]);
  const plan = explode(orders.flatMap((o) => o.items));
  const r = reports(now, 30);
  const zoneC = orders.filter((o) => o.zone === "C").length;
  const empty = !hasAnyOrders();

  return (
    <>
      <PageHeader
        title="Today"
        sub={isNextWithOrders
          ? `No orders for ${formatDateShort(today)} · showing the next day with orders, ${formatDateShort(date)} · ${formatKlDateTime(now)} now`
          : `Kitchen is working on ${formatDateShort(date)} · ${formatKlDateTime(now)} now`}
      >
        <Link href={`/console/production?date=${date}`} className={buttonStyles.ghost}>Production</Link>
        <Link href={`/console/routes?date=${date}`} className={buttonStyles.primary}>Routes</Link>
      </PageHeader>

      {empty && (
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 border-dashed p-5">
          <div>
            <p className="font-bold">No orders yet</p>
            <p className="text-sm text-muted">Place a test order from the storefront, or load sample orders to explore every screen. Sample orders are marked and can be removed in one click.</p>
          </div>
          <form action={demoDataAction}>
            <button className={buttonStyles.dawn}>Load sample orders</button>
          </form>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={`Bowls · ${formatDateShort(date)}`} value={<>{summary.bowls}<span className="text-base text-muted"> / {capacity}</span></>} sub={`${capacity ? Math.round((summary.bowls / capacity) * 100) : 0}% of capacity`} />
        <Kpi label="Awaiting WhatsApp" value={awaiting.length} sub={awaiting[0] ? `oldest since ${formatKlDateTime(new Date(awaiting[0].createdAt))}` : "all clear"} accent={awaiting.length > 0} />
        <Kpi label={`Due · ${formatDateShort(date)}`} value={formatRM(summary.dueSen)} sub={`cash on delivery ${formatRM(summary.codSen)} · pick-up ${formatRM(summary.pickupSen)}`} />
        <Kpi label="No-show rate · 30 days" value={`${(r.noShowRate * 100).toFixed(1)}%`} sub={`${r.completedOrders} completed orders`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Capacity · {formatDateShort(date)}</h2>
            <span className="text-xs text-muted"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-field" />confirmed <span className="ml-2 mr-1 inline-block h-2 w-2 rounded-full bg-dawn" />held</span>
          </div>
          <div className="mt-4 space-y-4">
            {slots.map((s) => (
              <div key={s.slotId}>
                <div className="flex justify-between text-sm">
                  <span className="font-mono font-bold">{s.label}</span>
                  <span className="text-muted">{s.confirmed} confirmed · {s.held} held · {s.left} free of {s.capacity}</span>
                </div>
                <div className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-mist">
                  <div className="bg-field" style={{ width: `${s.capacity ? (s.confirmed / s.capacity) * 100 : 0}%` }} />
                  <div className="bg-dawn" style={{ width: `${s.capacity ? (s.held / s.capacity) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <BowlCounts counts={plan.bowls} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Awaiting WhatsApp</h2>
            <span className="rounded-full bg-[#FCE3C6] px-2 py-0.5 text-xs font-bold text-[#9A5410]">{awaiting.length}</span>
          </div>
          {awaiting.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing waiting. New orders appear here until you confirm them.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {awaiting.slice(0, 8).map((o) => (
                <li key={o.ref} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-bold">{o.ref}</p>
                    <p className="truncate text-xs text-muted">{o.name} · {o.bowls} bowl{o.bowls > 1 ? "s" : ""} · {formatRM(o.totalSen)} · {formatDateShort(o.date)} {o.slotLabel}</p>
                  </div>
                  <TierBadge tier={customerStats(o.customerId, now).tier} />
                  <Link href={`/console/orders/${o.ref}`} className={cx(buttonStyles.small, "bg-field text-white")}>Verify</Link>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-5 text-sm font-bold">Alerts</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {slots.filter((s) => s.state !== "open").map((s) => (
              <li key={s.slotId} className="rounded-xl bg-[#FCE3C6] px-3 py-2">⚠ {s.label} is {s.state === "full" ? "full" : `almost full (${s.left} left)`}.</li>
            ))}
            {zoneC > 1 && <li className="rounded-xl bg-mist px-3 py-2">ℹ {zoneC} Zone C deliveries on {formatDateShort(date)} — consider one combined run.</li>}
            {r.unsettledSen > 0 && <li className="rounded-xl bg-mist px-3 py-2">ℹ {formatRM(r.unsettledSen)} from completed orders isn&apos;t marked settled yet.</li>}
            {slots.every((s) => s.state === "open") && zoneC <= 1 && r.unsettledSen === 0 && <li className="text-muted">No alerts.</li>}
          </ul>
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <h2 className="font-bold">Orders · {formatDateShort(date)}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-wider text-muted">
              <tr><th className="py-2">Ref</th><th>Customer</th><th>Slot</th><th>Where</th><th>Bowls</th><th>Total</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.ref}>
                  <td className="py-2 font-mono text-xs font-bold"><Link href={`/console/orders/${o.ref}`} className="hover:underline">{o.ref}</Link></td>
                  <td>{o.name}{o.isDemo && <span className="ml-1 text-[10px] text-muted">(sample)</span>}</td>
                  <td className="font-mono text-xs">{o.slotLabel}</td>
                  <td>{o.mode === "delivery" ? `Zone ${o.zone}` : "Pick-up"}</td>
                  <td>{o.bowls}</td>
                  <td className="font-mono">{formatRM(o.totalSen)}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted">No orders for this day yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[640px]" />}>
      <Today />
    </Suspense>
  );
}
