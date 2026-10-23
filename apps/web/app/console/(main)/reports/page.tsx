import { Suspense } from "react";
import { BOWLS, formatDateShort, formatRM, klDateKey } from "@fieldcut/core";
import { demoDataAction } from "@/actions/console";
import { Kpi, PageHeader } from "@/components/console/page-header";
import { buttonStyles, Card, cx, Skeleton } from "@/components/ui";
import { requireOwner } from "@/server/auth";
import { requestNow } from "@/server/clock";
import { reports } from "@/server/repo";

async function Reports() {
  await requireOwner();
  const now = await requestNow();
  const r = reports(now, 30);
  const max = Math.max(1, ...r.perDay.map((d) => d.bowls));
  const mixTotal = r.mix.reduce((s, m) => s + m.qty, 0) || 1;
  return (
    <>
      <PageHeader title="Reports" sub="Last 30 days. The KPIs from the business plan, computed from orders and events." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Bowls delivered" value={r.bowls} sub={`${r.completedOrders} completed orders`} />
        <Kpi label="Revenue (completed)" value={formatRM(r.revenueSen)} sub={`avg order ${formatRM(r.avgOrderSen)} · target ≥ RM35`} />
        <Kpi label="Repeat customers" value={`${Math.round(r.repeatRate * 100)}%`} sub="ordered 2+ times · target ≥ 40%" />
        <Kpi label="Median time to confirm" value={r.medianConfirmMinutes === null ? "—" : `${Math.round(r.medianConfirmMinutes)} min`} sub={`no-show rate ${(r.noShowRate * 100).toFixed(1)}% · target ≤ 3%`} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <h2 className="font-bold">Bowls per day</h2>
          <div className="mt-4 flex h-48 items-end gap-1">
            {r.perDay.map((d) => (
              <div key={d.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100">{d.bowls}</span>
                <div className={cx("w-full min-h-[3px] rounded-t", d.date > klDateKey(now) ? "bg-[#C9DDB3]" : "bg-field")} style={{ height: `${(d.bowls / max) * 100}%` }} title={`${formatDateShort(d.date)}: ${d.bowls}`} />
              </div>
            ))}
            {r.perDay.length === 0 && <p className="self-center text-sm text-muted">No orders in this period.</p>}
          </div>
          <p className="mt-2 text-xs text-muted">Dark: past days · light: booked ahead.</p>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Bowl mix</h2>
          <ul className="mt-3 space-y-3">
            {r.mix.map((m) => (
              <li key={m.slug}>
                <div className="flex justify-between text-sm"><span>{BOWLS.find((b) => b.slug === m.slug)?.name ?? m.slug}</span><b className="font-mono">{Math.round((m.qty / mixTotal) * 100)}%</b></div>
                <div className="mt-1 h-2 rounded-full bg-mist"><div className="h-2 rounded-full bg-dawn" style={{ width: `${(m.qty / mixTotal) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">Unsettled from completed orders: <b className="font-mono">{formatRM(r.unsettledSen)}</b></p>
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-xs text-muted">Sample orders (marked “sample”) let you explore every screen. They never affect real customers&apos; tiers.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <form action={demoDataAction}>
                <button className={cx(buttonStyles.small, "bg-dawn text-loam")}>Load sample orders</button>
              </form>
              <form action={demoDataAction}>
                <input type="hidden" name="mode" value="clear" />
                <button className={cx(buttonStyles.small, "border border-line bg-white")}>Remove all sample orders</button>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[500px]" />}>
      <Reports />
    </Suspense>
  );
}
