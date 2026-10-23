import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  displayPhone, formatDateShort, formatKlDateTime, formatRM, label, normalizeRef, renderReply, waLink, waNumber,
  type ReplyTemplate,
} from "@fieldcut/core";
import { settlementAction } from "@/actions/console";
import { AdvanceButtons } from "@/components/console/advance-buttons";
import { ConfirmForm } from "@/components/console/confirm-form";
import { buttonStyles, Card, cx, Skeleton, StatusBadge, TierBadge } from "@/components/ui";
import { requireOwner } from "@/server/auth";
import { requestNow } from "@/server/clock";
import { customerOrders, customerStats, getEvents, getOrder, getPlanOrders, SETTLEMENT_LABELS } from "@/server/repo";

const REPLIES: { t: ReplyTemplate; label: string }[] = [
  { t: "confirmed", label: "Confirmed" },
  { t: "on_the_way", label: "On the way" },
  { t: "running_late", label: "Running late" },
  { t: "ready", label: "Ready for pick-up" },
];

async function Detail({ params }: { params: Promise<{ ref: string }> }) {
  await requireOwner();
  const now = await requestNow();
  const ref = normalizeRef((await params).ref);
  const o = getOrder(ref);
  if (!o) notFound();
  const stats = customerStats(o.customerId, now);
  const history = customerOrders(o.customerId, 6).filter((x) => x.ref !== o.ref);
  const events = getEvents(o.id);
  const plan = o.planRef ? getPlanOrders(o.planRef) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/console/orders?date=${o.date}`} className="text-sm font-bold text-muted hover:text-loam">← Orders · {formatDateShort(o.date)}</Link>
          <h1 className="mt-1 font-mono text-3xl font-bold">{o.ref}</h1>
          <p className="text-sm text-muted">Created {formatKlDateTime(new Date(o.createdAt))} · {formatDateShort(o.date)} · {o.slotLabel}{o.isDemo && " · sample order"}</p>
        </div>
        <StatusBadge status={o.status} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          {o.status === "SUBMITTED" && <ConfirmForm orderRef={o.ref} isDemo={o.isDemo} />}

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Customer</p>
              <p className="mt-1 text-lg font-bold">{o.name}</p>
              <p className="font-mono text-sm">{displayPhone(o.phone)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <TierBadge tier={stats.tier} />
                {stats.completed} completed · {stats.noShowsLast60Days} no-shows (60 d) · {stats.openOrders} open
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Fulfilment</p>
              <p className="mt-1 text-lg font-bold">{o.mode === "delivery" ? `Delivery · Zone ${o.zone}` : "Self pick-up"}</p>
              {o.mode === "delivery" && <p className="text-sm">{o.address}{o.areaName && `, ${o.areaName}`}</p>}
              {o.notes && <p className="mt-1 text-sm text-muted">Note: {o.notes}</p>}
              <p className="mt-2 text-sm">Settle: <b>{SETTLEMENT_LABELS[o.settlementMethod]}</b></p>
            </Card>
          </div>

          <Card className="p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Items · prices at time of order</p>
            <ul className="mt-2 divide-y divide-line">
              {o.items.map((i, k) => (
                <li key={k} className="flex justify-between gap-4 py-2 text-sm">
                  <span><b>{i.qty}× {i.name}</b><span className="block text-xs text-muted">{i.detail} · {i.kcal} kcal · {i.proteinG} g protein</span></span>
                  <span className="font-mono">{formatRM(i.lineSen)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-mono">{formatRM(o.subtotalSen)}</dd></div>
              {o.mode === "delivery" && <div className="flex justify-between"><dt>Delivery</dt><dd className="font-mono">{formatRM(o.deliverySen)}</dd></div>}
              <div className="flex justify-between text-base font-extrabold"><dt>Total due</dt><dd className="font-mono">{formatRM(o.totalSen)}</dd></div>
            </dl>
          </Card>

          {plan.length > 0 && (
            <Card className="p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Five-day plan {o.planRef}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {plan.map((p) => (
                  <li key={p.ref} className="flex items-center justify-between gap-2">
                    <Link href={`/console/orders/${p.ref}`} className={cx("hover:underline", p.ref === o.ref && "font-bold")}>
                      {formatDateShort(p.date)} · {p.items[0]?.name}
                    </Link>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Next step</p>
            <div className="mt-2">
              {o.status === "SUBMITTED" ? <p className="text-sm text-muted">Confirm with the verify code first.</p> : <AdvanceButtons orderRef={o.ref} status={o.status} mode={o.mode} />}
              {["COMPLETED", "CANCELLED", "EXPIRED", "NO_SHOW"].includes(o.status) && <p className="text-sm text-muted">This order is {label(o.status).toLowerCase()}.</p>}
            </div>
            <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wider text-muted">Settlement</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["UNSETTLED", "SETTLED", "WAIVED"] as const).map((s) => (
                <form key={s} action={settlementAction}>
                  <input type="hidden" name="ref" value={o.ref} />
                  <input type="hidden" name="settlement" value={s} />
                  <button className={cx(buttonStyles.small, o.settlement === s ? "bg-loam text-white" : "border border-line bg-white")}>{s.toLowerCase()}</button>
                </form>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Reply on WhatsApp</p>
            {o.isDemo ? (
              <p className="mt-2 text-sm text-muted">Disabled for sample orders (their numbers aren&apos;t real customers).</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REPLIES.map((r) => (
                  <a key={r.t} target="_blank" rel="noopener noreferrer"
                    href={waLink(renderReply(r.t, { name: o.name, ref: o.planRef ?? o.ref, date: o.date, slotLabel: o.slotLabel, totalSen: o.totalSen, mode: o.mode }), waNumber(o.phone))}
                    className={cx(buttonStyles.small, "bg-[#1F8A4C] text-white")}>{r.label}</a>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Event log</p>
            <ol className="mt-2 space-y-1.5 text-sm">
              {events.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-24 shrink-0 font-mono text-xs text-muted">{formatKlDateTime(new Date(e.at)).split(" ").slice(-1)[0]} <span className="block">{formatKlDateTime(new Date(e.at)).split(" ").slice(0, 3).join(" ")}</span></span>
                  <span>
                    <b>{e.type}</b>{e.to_status && <> → {e.to_status.toLowerCase().replaceAll("_", " ")}</>} <span className="text-muted">by {e.actor}</span>
                    {e.note && <span className="block text-xs text-muted">{e.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          {history.length > 0 && (
            <Card className="p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Previous orders</p>
              <ul className="mt-2 space-y-1 text-sm">
                {history.map((h) => (
                  <li key={h.ref} className="flex justify-between gap-2">
                    <Link className="font-mono text-xs hover:underline" href={`/console/orders/${h.ref}`}>{h.ref}</Link>
                    <StatusBadge status={h.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage({ params }: PageProps<"/console/orders/[ref]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Detail params={params} />
    </Suspense>
  );
}
