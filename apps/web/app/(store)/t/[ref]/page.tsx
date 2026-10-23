import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cutoffFor, formatDateShort, formatKlDateTime, formatRM, KITCHEN_WHATSAPP, normalizeRef, type Status } from "@fieldcut/core";
import { cancelOrderAction } from "@/actions/store";
import { TrackForm } from "@/components/track-form";
import { buttonStyles, Card, cx, Skeleton, StatusBadge } from "@/components/ui";
import { canTrack } from "@/server/auth";
import { requestNow } from "@/server/clock";
import { getEvents, getOrder, getPlanOrders, type OrderView } from "@/server/repo";

export const metadata: Metadata = { title: "Your order · Fieldcut", robots: { index: false } };

const STEPS: { key: string; label: string; reached: Status[] }[] = [
  { key: "received", label: "Order received", reached: ["SUBMITTED", "CONFIRMED", "IN_PREP", "PACKED", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "COMPLETED"] },
  { key: "confirmed", label: "Confirmed on WhatsApp", reached: ["CONFIRMED", "IN_PREP", "PACKED", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "COMPLETED"] },
  { key: "prep", label: "In prep · cut at dawn", reached: ["IN_PREP", "PACKED", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "COMPLETED"] },
  { key: "packed", label: "Packed & sealed", reached: ["PACKED", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "COMPLETED"] },
  { key: "out", label: "On the way / ready", reached: ["OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "COMPLETED"] },
  { key: "done", label: "Delivered", reached: ["COMPLETED"] },
];

function Timeline({ order }: { order: OrderView }) {
  const events = getEvents(order.id);
  const when = (type: string) => events.find((e) => e.type === type)?.at;
  const times: Record<string, string | undefined> = {
    received: when("created"), confirmed: when("confirm"), prep: when("lock"), packed: when("pack"),
    out: when("dispatch") ?? when("ready"), done: when("complete"),
  };
  const ended = ["EXPIRED", "CANCELLED", "NO_SHOW"].includes(order.status);
  return (
    <ol className="space-y-0">
      {STEPS.map((s, i) => {
        const reached = s.reached.includes(order.status);
        const current = reached && (i === STEPS.length - 1 || !STEPS[i + 1].reached.includes(order.status));
        return (
          <li key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cx("mt-1 h-4 w-4 rounded-full", current && !ended ? "bg-dawn ring-4 ring-dawn/25" : reached ? "bg-field" : "border-2 border-line bg-white")} />
              {i < STEPS.length - 1 && <span className={cx("w-0.5 flex-1", reached && STEPS[i + 1].reached.includes(order.status) ? "bg-field" : "bg-line")} style={{ minHeight: 28 }} />}
            </div>
            <div className="pb-4">
              <p className={cx("font-bold", !reached && "text-[#A9AFA7]")}>{s.label}</p>
              {times[s.key] && <p className="font-mono text-xs text-muted">{formatKlDateTime(new Date(times[s.key]!))}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

async function Tracking({ params }: { params: Promise<{ ref: string }> }) {
  const ref = normalizeRef((await params).ref);
  const now = await requestNow();
  if (!(await canTrack(ref))) {
    return (
      <Card className="mx-auto max-w-md p-6">
        <h1 className="font-display text-2xl font-semibold">Track your order</h1>
        <p className="mb-4 mt-1 text-sm text-muted">Enter the last 4 digits of the phone number on the order.</p>
        <TrackForm defaultRef={ref} />
      </Card>
    );
  }
  const order = getOrder(ref);
  if (!order) notFound();
  const orders = order.planRef ? getPlanOrders(order.planRef) : [order];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <p className="text-sm font-bold text-muted">{order.planRef ? "Five-day plan" : "Order"}</p>
        <h1 className="font-mono text-3xl font-bold">{order.planRef ?? order.ref}</h1>
      </div>
      {orders.map((o) => {
        const canCancel = (o.status === "SUBMITTED" || o.status === "CONFIRMED") && now < cutoffFor(o.date);
        return (
          <Card key={o.ref} className="grid gap-6 p-5 md:grid-cols-[1fr_1.1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={o.status} />
                <span className="text-sm font-bold">{formatDateShort(o.date)} · {o.slotLabel}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {o.mode === "delivery" ? `Delivery · Zone ${o.zone}${o.areaName ? ` · ${o.areaName}` : ""}` : "Self pick-up"}
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {o.items.map((i, k) => (
                  <li key={k} className="flex justify-between gap-3">
                    <span>{i.qty}× {i.name}<span className="block text-xs text-muted">{i.detail}</span></span>
                    <span className="font-mono">{formatRM(i.lineSen)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex justify-between border-t border-line pt-2 font-extrabold">
                <span>Total due{o.mode === "delivery" ? " incl. delivery" : ""}</span>
                <span className="font-mono">{formatRM(o.totalSen)}</span>
              </p>
              <p className="text-xs text-muted">Settle on hand-over · nothing is charged online.</p>
              {o.status === "SUBMITTED" && (
                <Link href={`/order/${o.planRef ?? o.ref}`} className={cx(buttonStyles.small, "mt-3 bg-[#1F8A4C] text-white")}>
                  Haven&apos;t sent it on WhatsApp yet? Send now →
                </Link>
              )}
              {canCancel && (
                <form action={cancelOrderAction} className="mt-3">
                  <input type="hidden" name="ref" value={o.ref} />
                  <button className={cx(buttonStyles.small, "border border-line bg-white text-loam")}>
                    Cancel{o.planRef ? " this plan" : ""} (until 22:00 the night before)
                  </button>
                </form>
              )}
              {o.status === "EXPIRED" && <p className="mt-3 text-sm text-radish">This order wasn&apos;t confirmed before 22:30, so the slot was released. You&apos;re welcome to order again.</p>}
            </div>
            <Timeline order={o} />
          </Card>
        );
      })}
      <p className="text-center text-sm text-muted">
        Questions? <a className="font-bold text-field" href={`https://wa.me/${KITCHEN_WHATSAPP}`}>Message us on WhatsApp</a>
      </p>
    </div>
  );
}

export default function TrackOrderPage({ params }: PageProps<"/t/[ref]">) {
  return (
    <div className="px-5 py-10">
      <Suspense fallback={<Skeleton className="mx-auto h-[420px] max-w-3xl" />}>
        <Tracking params={params} />
      </Suspense>
    </div>
  );
}
