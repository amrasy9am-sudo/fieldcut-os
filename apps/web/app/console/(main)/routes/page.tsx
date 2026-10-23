import Link from "next/link";
import { Suspense } from "react";
import { displayPhone, formatDateShort, formatRM, renderReply, waLink, waNumber } from "@fieldcut/core";
import { advanceOrderAction } from "@/actions/console";
import { DateNav } from "@/components/console/date-nav";
import { Kpi, PageHeader } from "@/components/console/page-header";
import { buttonStyles, Card, cx, Skeleton, StatusBadge } from "@/components/ui";
import { requireOwner } from "@/server/auth";
import { requestNow } from "@/server/clock";
import { availabilityFor, listOrdersForDate, type OrderView } from "@/server/repo";
import { pickDate, serviceDate } from "@/server/service-date";

function Stop({ o, i }: { o: OrderView; i: number }) {
  const done = o.status === "COMPLETED";
  return (
    <li className="flex flex-wrap items-start gap-3 py-3">
      <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white", done ? "bg-field" : "bg-loam")}>{done ? "✓" : i + 1}</span>
      <div className="min-w-[180px] flex-1">
        <p className="font-bold">{o.name} <span className="font-mono text-[11px] font-normal text-muted">{o.ref.slice(-5)}</span></p>
        <p className="text-xs text-muted">{o.mode === "delivery" ? `${o.address}${o.areaName ? `, ${o.areaName}` : ""} · Zone ${o.zone}` : "Self pick-up"} · {o.bowls} bowl{o.bowls > 1 ? "s" : ""}</p>
        {o.notes && <p className="text-xs text-muted">Note: {o.notes}</p>}
        <p className="font-mono text-xs">{displayPhone(o.phone)}</p>
      </div>
      <div className="text-right">
        <p className="font-mono font-bold">{formatRM(o.totalSen)}</p>
        <p className={cx("text-[11px] font-bold", o.settlement === "SETTLED" ? "text-field" : "text-muted")}>{o.settlement === "SETTLED" ? "Settled" : "To collect"}</p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-1.5 pl-10">
        <StatusBadge status={o.status} />
        {o.status === "PACKED" && o.mode === "delivery" && (
          <form action={advanceOrderAction}><input type="hidden" name="ref" value={o.ref} /><input type="hidden" name="event" value="dispatch" />
            <button className={cx(buttonStyles.small, "bg-loam text-white")}>Out for delivery</button></form>
        )}
        {o.status === "PACKED" && o.mode === "pickup" && (
          <form action={advanceOrderAction}><input type="hidden" name="ref" value={o.ref} /><input type="hidden" name="event" value="ready" />
            <button className={cx(buttonStyles.small, "bg-loam text-white")}>Ready for pick-up</button></form>
        )}
        {(o.status === "OUT_FOR_DELIVERY" || o.status === "READY_FOR_PICKUP") && (
          <>
            <form action={advanceOrderAction}><input type="hidden" name="ref" value={o.ref} /><input type="hidden" name="event" value="complete" /><input type="hidden" name="settle" value="1" />
              <button className={cx(buttonStyles.small, "bg-field text-white")}>Handed over &amp; settled</button></form>
            <form action={advanceOrderAction}><input type="hidden" name="ref" value={o.ref} /><input type="hidden" name="event" value="no_show" /><input type="hidden" name="note" value="Unreachable 30 min after slot" />
              <button className={cx(buttonStyles.small, "border border-line bg-white text-radish")}>No-show</button></form>
          </>
        )}
        {!o.isDemo && !done && (
          <a target="_blank" rel="noopener noreferrer" className={cx(buttonStyles.small, "bg-[#1F8A4C] text-white")}
            href={waLink(renderReply(o.mode === "delivery" ? "on_the_way" : "ready", { name: o.name, ref: o.ref, date: o.date, slotLabel: o.slotLabel, totalSen: o.totalSen, mode: o.mode }), waNumber(o.phone))}>
            WhatsApp {o.mode === "delivery" ? "“on the way”" : "“ready”"}
          </a>
        )}
        <Link href={`/console/orders/${o.ref}`} className="text-xs font-bold text-muted underline">Details</Link>
      </div>
    </li>
  );
}

async function Routes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireOwner();
  const now = await requestNow();
  const date = pickDate((await searchParams).date, serviceDate(now));
  const orders = listOrdersForDate(date, ["CONFIRMED", "IN_PREP", "PACKED", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "COMPLETED", "NO_SHOW"]);
  const slots = availabilityFor(date);
  const toCollect = orders.filter((o) => o.status !== "NO_SHOW").reduce((s, o) => s + o.totalSen, 0);
  const collected = orders.filter((o) => o.settlement === "SETTLED").reduce((s, o) => s + o.totalSen, 0);
  const done = orders.filter((o) => o.status === "COMPLETED").length;

  return (
    <>
      <PageHeader title={`Routes · ${formatDateShort(date)}`} sub="Grouped by slot, then by zone (A → B → C). Pick-ups listed separately.">
        <DateNav path="/console/routes" date={date} />
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="To collect" value={formatRM(toCollect)} />
        <Kpi label="Collected" value={formatRM(collected)} />
        <Kpi label="Handed over" value={`${done} / ${orders.length}`} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {slots.map((slot) => {
          const deliveries = orders.filter((o) => o.slotId === slot.slotId && o.mode === "delivery").sort((a, b) => (a.zone ?? "").localeCompare(b.zone ?? ""));
          const pickups = orders.filter((o) => o.slotId === slot.slotId && o.mode === "pickup");
          if (!deliveries.length && !pickups.length) return null;
          const mapsUrl = `https://www.google.com/maps/dir/${["Seri Manjung, Perak", ...deliveries.map((o) => `${o.address}, ${o.areaName ?? ""}, Perak`)].map(encodeURIComponent).join("/")}`;
          return (
            <Card key={slot.slotId} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">{slot.label} · {deliveries.length} drops · {deliveries.reduce((s, o) => s + o.bowls, 0) + pickups.reduce((s, o) => s + o.bowls, 0)} bowls</h2>
                {deliveries.length > 0 && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={cx(buttonStyles.small, "border border-line bg-white")}>Open route in Maps ↗</a>}
              </div>
              {deliveries.length > 0 && <ol className="mt-2 divide-y divide-line">{deliveries.map((o, i) => <Stop key={o.ref} o={o} i={i} />)}</ol>}
              {pickups.length > 0 && (
                <>
                  <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wider text-muted">Pick-ups</p>
                  <ol className="divide-y divide-line">{pickups.map((o, i) => <Stop key={o.ref} o={o} i={i} />)}</ol>
                </>
              )}
            </Card>
          );
        })}
        {orders.length === 0 && <p className="text-sm text-muted">No confirmed orders for this day.</p>}
      </div>
    </>
  );
}

export default function RoutesPage({ searchParams }: PageProps<"/console/routes">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Routes searchParams={searchParams} />
    </Suspense>
  );
}
