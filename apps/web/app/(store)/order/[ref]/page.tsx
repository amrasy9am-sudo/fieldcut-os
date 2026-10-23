import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import { formatDateShort, formatKlDateTime, formatRM, KITCHEN_WHATSAPP_DISPLAY, normalizeRef, waLink } from "@fieldcut/core";
import { CopyButton } from "@/components/copy-button";
import { TrackForm } from "@/components/track-form";
import { buttonStyles, Card, Skeleton, StatusBadge } from "@/components/ui";
import { canTrack } from "@/server/auth";
import { baseUrl } from "@/server/base-url";
import { requestNow } from "@/server/clock";
import { messageFor } from "@/server/messages";
import { getOrder, getPlanOrders } from "@/server/repo";

export const metadata: Metadata = { title: "Send your order · Fieldcut", robots: { index: false } };

async function Handoff({ params }: { params: Promise<{ ref: string }> }) {
  const ref = normalizeRef((await params).ref);
  await requestNow();
  if (!(await canTrack(ref))) {
    return (
      <Card className="mx-auto max-w-md p-6">
        <h1 className="font-display text-2xl font-semibold">Confirm it&apos;s your order</h1>
        <p className="mb-4 mt-1 text-sm text-muted">For your privacy, enter the last 4 digits of the phone number on the order.</p>
        <TrackForm defaultRef={ref} />
      </Card>
    );
  }
  const order = getOrder(ref);
  if (!order) notFound();
  const planDays = order.planRef ? getPlanOrders(order.planRef) : [order];
  const base = await baseUrl();
  const message = messageFor(order, base);
  const link = waLink(message);
  const qr = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "L", color: { dark: "#1E2B23", light: "#FFFFFF" } });
  const total = planDays.reduce((s, o) => s + o.totalSen, 0);
  const waiting = order.status === "SUBMITTED";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <div className="grid h-14 w-14 place-items-center rounded-full bg-field text-2xl text-white">✓</div>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl">
          {waiting ? (
            <>Order saved.<br /><span className="font-normal italic text-field">One step left.</span></>
          ) : (
            <>Order received.<br /><span className="font-normal italic text-field">We&apos;re on it.</span></>
          )}
        </h1>
        {waiting ? (
          <p className="mt-3 max-w-lg text-lg text-muted">
            Send it to our kitchen on WhatsApp so we can confirm. Your {order.slotLabel} slot is held until{" "}
            <b className="text-loam">{formatKlDateTime(new Date(order.holdExpiresAt))}</b>.
          </p>
        ) : (
          <p className="mt-3 text-lg text-muted">Status: <StatusBadge status={order.status} /></p>
        )}

        <Card className="mt-6 flex items-center justify-between p-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{order.planRef ? "Plan reference" : "Reference"}</p>
            <p className="font-mono text-2xl font-bold">{order.planRef ?? order.ref}</p>
          </div>
          <CopyButton text={order.planRef ?? order.ref} />
        </Card>

        <div className="mt-4 flex flex-wrap gap-3">
          <a href={link} className={buttonStyles.whatsapp} target="_blank" rel="noopener noreferrer">
            Open WhatsApp · {KITCHEN_WHATSAPP_DISPLAY}
          </a>
          <CopyButton text={message} label="Copy message" className="h-12" />
        </div>

        <ol className="mt-8 space-y-4">
          {[
            { t: "Send the message", d: "WhatsApp opens with your order filled in. Just press send.", on: waiting },
            { t: "We confirm", d: "Usually within 15 minutes, 08:00–22:30.", on: false },
            { t: "Cut at dawn", d: `Your bowls are made on the morning of ${formatDateShort(order.date)}.`, on: false },
            { t: `Delivered ${order.slotLabel}`, d: `Pay ${formatRM(total)} ${order.mode === "delivery" ? "to our rider" : "at pick-up"}.`, on: false },
          ].map((s, i) => (
            <li key={s.t} className="flex gap-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-extrabold ${s.on ? "bg-dawn" : "bg-mist"}`}>{i + 1}</span>
              <div>
                <p className="font-bold">{s.t}</p>
                <p className="text-sm text-muted">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href={`/t/${order.planRef ?? order.ref}`} className="mt-6 inline-block font-bold text-field">Track this order →</Link>
      </div>

      <div className="space-y-4">
        <Card className="flex items-center gap-4 p-4">
          <div className="w-36 shrink-0 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
          <div>
            <p className="font-bold">On a laptop?</p>
            <p className="text-sm text-muted">Scan with your phone camera. WhatsApp opens with this order ready to send from your own number.</p>
          </div>
        </Card>
        <div className="rounded-2xl bg-[#E9E2D5] p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Preview of your message</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl rounded-br-sm bg-[#DCF5C9] p-3 font-mono text-[12px] leading-relaxed text-loam shadow-sm">{message}</pre>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage({ params }: PageProps<"/order/[ref]">) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <Suspense fallback={<Skeleton className="h-[520px]" />}>
        <Handoff params={params} />
      </Suspense>
    </div>
  );
}
