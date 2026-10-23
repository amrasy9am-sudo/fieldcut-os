"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  getArea, formatRM, quoteOrder, type DateOption, type PriceOverrides, type SlotAvailability,
} from "@fieldcut/core";
import { placeOrderAction, type PlaceOrderState } from "@/actions/store";
import { cart, loadDetails, newIdempotencyKey, saveDetails, useCart } from "@/lib/cart";
import { BOWLS } from "@fieldcut/core";
import { BowlArt } from "./bowl-art";
import { DetailsFields, type Details } from "./details-fields";
import { DateStrip, SlotCells } from "./slot-picker";
import { buttonStyles, Card, cx, Skeleton } from "./ui";
import { useHydrated } from "@/lib/use-hydrated";

type Props = {
  options: DateOption[];
  availability: Record<string, SlotAvailability[]>;
  prices: PriceOverrides;
  soldOut: string[];
};

/** Saved details live in this browser, so the form renders after hydration. */
export function CheckoutForm(props: Props) {
  const hydrated = useHydrated();
  return hydrated ? <CheckoutFormInner {...props} /> : <Skeleton className="h-[600px]" />;
}

function CheckoutFormInner({ options, availability, prices, soldOut }: Props) {
  const router = useRouter();
  const lines = useCart();
  const [details, setDetails] = useState<Details>(() => ({ name: "", phone: "", mode: "delivery", area: "", address: "", ...loadDetails(), notes: "" }));
  const firstDate = options.find((o) => o.bookable)?.date ?? "";
  const [date, setDate] = useState(firstDate);
  const [slot, setSlot] = useState<number | null>(null);
  const [settlement, setSettlement] = useState<"default" | "arranged">("default");
  const [idem] = useState(newIdempotencyKey);
  const [state, action, pending] = useActionState<PlaceOrderState, FormData>(placeOrderAction, null);

  useEffect(() => {
    if (state?.ref) {
      saveDetails({ name: details.name, phone: details.phone, mode: details.mode, area: details.area, address: details.address });
      cart.clear();
      router.push(`/order/${state.ref}`);
    }
  }, [state, router, details]);

  const zone = details.mode === "delivery" ? (getArea(details.area)?.zone ?? null) : null;
  const needsArea = details.mode === "delivery" && !details.area;
  // Until an area is chosen, show food totals only (no delivery fee yet).
  const quote = useMemo(
    () => quoteOrder({ lines, mode: needsArea ? "pickup" : details.mode, zone, overrides: prices }),
    [lines, needsArea, details.mode, zone, prices],
  );
  const slots = availability[date] ?? [];
  const chosen = slots.find((s) => s.slotId === slot);
  const slotFits = chosen ? chosen.left >= quote.bowls : false;
  const soldOutInBag = lines.some((l) => soldOut.includes(l.slug));

  if (lines.length === 0 && !state?.ref) {
    return (
      <Card className="p-10 text-center">
        <p className="font-display text-3xl font-semibold">Your bag is empty</p>
        <p className="mt-2 text-muted">Pick a bowl to get started.</p>
        <Link href="/#menu" className={cx(buttonStyles.dawn, "mt-5")}>See the menu</Link>
      </Card>
    );
  }

  const blocking =
    quote.problems[0] ??
    (soldOutInBag ? "One of your bowls is sold out today. Please remove it." : null) ??
    (needsArea ? "Choose your delivery area to see the delivery fee." : null);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <input type="hidden" name="cart" value={JSON.stringify(lines.map((l) => ({ slug: l.slug, qty: l.qty, dressing: l.dressing, addOns: l.addOns, leaveOut: l.leaveOut })))} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="slot" value={slot ?? ""} />
      <input type="hidden" name="idem" value={idem} />
      <input type="hidden" name="settlement" value={settlement === "arranged" ? "arranged" : details.mode === "pickup" ? "pickup" : "cod"} />

      <div className="min-w-0 space-y-6">
        <Card className="p-5">
          <h2 className="font-display text-xl font-semibold">1 · Who&apos;s eating?</h2>
          <div className="mt-4">
            <DetailsFields value={details} onChange={setDetails} errorField={state?.field} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-xl font-semibold">2 · When?</h2>
          <div className="mt-4">
            <DateStrip options={options} value={date} onChange={(d) => { setDate(d); setSlot(null); }} />
          </div>
          <div className="mt-4">
            {slots.length ? (
              <SlotCells slots={slots} value={slot} onChange={setSlot} bowls={quote.bowls} />
            ) : (
              <p className="text-sm text-muted">No slots open on this day.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">Your slot is held until 22:30 the night before. We confirm on WhatsApp before then.</p>
        </Card>
      </div>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <h2 className="font-display text-xl font-semibold">Your bag</h2>
          <ul className="mt-3 divide-y divide-line">
            {quote.lines.map((l, i) => {
              const key = lines[i].key;
              const bowl = BOWLS.find((b) => b.slug === l.slug)!;
              return (
                <li key={key} className="flex gap-3 py-3">
                  <BowlArt protein={bowl.protein} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{l.name}</p>
                    <p className="text-xs text-muted">{l.detail}</p>
                    <p className="font-mono text-[11px] text-muted">{l.kcal} kcal · {l.proteinG} g protein</p>
                    {soldOut.includes(l.slug) && <p className="text-xs font-bold text-radish">Sold out today</p>}
                    <div className="mt-1 flex items-center gap-2">
                      <button type="button" aria-label="One fewer" onClick={() => cart.setQty(key, l.qty - 1)} className="h-7 w-7 rounded-lg border border-line font-bold">−</button>
                      <span className="w-4 text-center font-mono text-sm font-bold">{l.qty}</span>
                      <button type="button" aria-label="One more" onClick={() => cart.setQty(key, l.qty + 1)} className="h-7 w-7 rounded-lg border border-line font-bold">+</button>
                      <button type="button" onClick={() => cart.setQty(key, 0)} className="ml-2 text-xs font-bold text-muted underline">Remove</button>
                    </div>
                  </div>
                  <span className="font-mono text-sm">{formatRM(l.lineSen)}</span>
                </li>
              );
            })}
          </ul>
          <Link href="/#menu" className="text-sm font-bold text-field">+ Add another bowl</Link>
          <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-mono">{formatRM(quote.subtotalSen)}</dd></div>
            {details.mode === "delivery" && (
              <div className="flex justify-between"><dt>Delivery{zone ? ` · Zone ${zone}` : ""}</dt><dd className="font-mono">{zone ? formatRM(quote.deliverySen) : "—"}</dd></div>
            )}
            <div className="flex justify-between pt-1 text-lg font-extrabold"><dt>Total due</dt><dd className="font-mono">{formatRM(quote.totalSen)}</dd></div>
          </dl>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">How you&apos;ll settle</p>
          <div className="mt-2 space-y-2">
            {[
              { v: "default" as const, t: details.mode === "pickup" ? "Pay at pick-up" : "Cash on delivery", d: "Pay when your bowls are handed over." },
              { v: "arranged" as const, t: "Arrange on WhatsApp", d: "For office orders — agree how to settle directly with us." },
            ].map((o) => (
              <button key={o.v} type="button" onClick={() => setSettlement(o.v)} aria-pressed={settlement === o.v}
                className={cx("block w-full rounded-xl border p-3 text-left text-sm", settlement === o.v ? "border-2 border-loam" : "border-line")}>
                <span className="font-bold">{o.t}</span>
                <span className="block text-xs text-muted">{o.d}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Nothing is charged online. Fieldcut never asks for card or bank details.</p>
        </Card>

        {(state?.error || blocking) && (
          <p role="alert" className="rounded-xl bg-[#F6D9D3] p-3 text-sm font-bold text-[#9B2F21]">{state?.error ?? blocking}</p>
        )}
        <button type="submit" disabled={pending || !idem || !slot || !slotFits || Boolean(blocking)} className={cx(buttonStyles.dawn, "h-12 w-full text-base")}>
          {pending ? "Saving your order…" : !slot ? "Choose a slot" : `Place order · ${formatRM(quote.totalSen)}`}
        </button>
        <p className="text-center text-xs text-muted">
          Next you&apos;ll send the order to us on WhatsApp. By ordering you agree to our <Link href="/privacy" className="underline">privacy notice</Link>.
        </p>
      </div>
    </form>
  );
}
