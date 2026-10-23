"use client";

import { useRouter } from "next/navigation";
import { Fragment, useActionState, useEffect, useState } from "react";
import { BOWLS, formatDateShort, formatRM, getArea, planBowlPriceSen, ZONES, type BowlSlug } from "@fieldcut/core";
import { placePlanAction, type PlaceOrderState } from "@/actions/store";
import { loadDetails, newIdempotencyKey, saveDetails } from "@/lib/cart";
import { BowlArt } from "./bowl-art";
import { DetailsFields, type Details } from "./details-fields";
import { buttonStyles, Card, cx, Skeleton } from "./ui";
import { useHydrated } from "@/lib/use-hydrated";

type SlotSummary = { slotId: number; label: string; minLeft: number };

type PlanProps = { days: string[]; slots: SlotSummary[]; soldOut: string[]; unavailable: string | null };

export function PlanForm(props: PlanProps) {
  const hydrated = useHydrated();
  return hydrated ? <PlanFormInner {...props} /> : <Skeleton className="h-[600px]" />;
}

function PlanFormInner({ days, slots, soldOut, unavailable }: PlanProps) {
  const router = useRouter();
  const firstAvailable = BOWLS.find((b) => !soldOut.includes(b.slug))?.slug ?? "field-classic";
  const [picks, setPicks] = useState<BowlSlug[]>(days.map(() => firstAvailable));
  const [details, setDetails] = useState<Details>(() => ({ name: "", phone: "", mode: "delivery", area: "", address: "", ...loadDetails(), notes: "" }));
  const [slot, setSlot] = useState<number | null>(null);
  const [idem] = useState(newIdempotencyKey);
  const [state, action, pending] = useActionState<PlaceOrderState, FormData>(placePlanAction, null);
  useEffect(() => {
    if (state?.ref) {
      saveDetails({ name: details.name, phone: details.phone, mode: details.mode, area: details.area, address: details.address });
      router.push(`/order/${state.ref}`);
    }
  }, [state, router, details]);

  const zone = details.mode === "delivery" ? (getArea(details.area)?.zone ?? null) : null;
  const food = picks.reduce((s, slug) => s + planBowlPriceSen(slug), 0);
  const delivery = zone ? ZONES[zone].planFeeSen * days.length : 0;
  const outOfZone = details.mode === "delivery" && details.area !== "" && zone === null;
  const needsArea = details.mode === "delivery" && !details.area;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <input type="hidden" name="idem" value={idem} />
      <input type="hidden" name="slot" value={slot ?? ""} />
      <input type="hidden" name="settlement" value={details.mode === "pickup" ? "pickup" : "cod"} />
      {days.map((d, i) => (
        <Fragment key={d}>
          <input type="hidden" name={`day${i}_date`} value={d} />
          <input type="hidden" name={`day${i}_bowl`} value={picks[i]} />
        </Fragment>
      ))}

      <div className="min-w-0 space-y-6">
        <Card className="p-5">
          <h2 className="font-display text-xl font-semibold">1 · Pick a bowl for each day</h2>
          <div className="mt-4 space-y-3">
            {days.map((d, i) => (
              <div key={d} className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center">
                <span className="w-28 font-bold">{formatDateShort(d)}</span>
                <div className="flex flex-1 flex-wrap gap-2">
                  {BOWLS.map((b) => {
                    const on = picks[i] === b.slug;
                    const out = soldOut.includes(b.slug);
                    return (
                      <button key={b.slug} type="button" disabled={out} aria-pressed={on}
                        onClick={() => setPicks((p) => p.map((x, k) => (k === i ? b.slug : x)))}
                        className={cx("flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-bold transition disabled:opacity-40",
                          on ? "border-loam bg-loam text-white" : "border-line bg-white hover:border-loam")}>
                        <BowlArt protein={b.protein} size={24} />
                        {b.shortName}{b.slug === "harbour-salmon" ? " +RM8" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-xl font-semibold">2 · Your details</h2>
          <div className="mt-4">
            <DetailsFields value={details} onChange={setDetails} errorField={state?.field} planFees />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-xl font-semibold">3 · Daily slot</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {slots.map((s) => (
              <button key={s.slotId} type="button" disabled={s.minLeft < 1} onClick={() => setSlot(s.slotId)} aria-pressed={slot === s.slotId}
                className={cx("rounded-xl border p-3 text-left", slot === s.slotId ? "border-2 border-loam bg-white" : s.minLeft < 1 ? "border-dashed bg-[#EFEAE0] text-[#A9AFA7]" : "border-line bg-white")}>
                <span className="block font-mono text-sm font-bold">{s.label}</span>
                <span className="text-xs font-bold text-field">{s.minLeft < 1 ? "Full on at least one day" : "Available all five days"}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <h2 className="font-display text-xl font-semibold">Your week</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {days.map((d, i) => (
              <li key={d} className="flex justify-between">
                <span>{formatDateShort(d)} · {BOWLS.find((b) => b.slug === picks[i])!.shortName}</span>
                <span className="font-mono">{formatRM(planBowlPriceSen(picks[i]))}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt>Bowls</dt><dd className="font-mono">{formatRM(food)}</dd></div>
            {details.mode === "delivery" && <div className="flex justify-between"><dt>Delivery</dt><dd className="font-mono">{zone ? (delivery ? formatRM(delivery) : "Free") : "—"}</dd></div>}
            <div className="flex justify-between text-lg font-extrabold"><dt>Total due</dt><dd className="font-mono">{formatRM(food + delivery)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-muted">Settle on hand-over — daily, or all at once on Monday. Nothing is charged online.</p>
        </Card>
        {(state?.error || unavailable || outOfZone) && (
          <p role="alert" className="rounded-xl bg-[#F6D9D3] p-3 text-sm font-bold text-[#9B2F21]">
            {state?.error ?? unavailable ?? "That area is outside our delivery radius — choose self pick-up."}
          </p>
        )}
        <button type="submit" disabled={pending || !idem || !slot || Boolean(unavailable) || outOfZone || needsArea}
          className={cx(buttonStyles.dawn, "h-12 w-full text-base")}>
          {pending ? "Saving your plan…" : !slot ? "Choose a daily slot" : needsArea ? "Choose your area" : `Start my plan · ${formatRM(food + delivery)}`}
        </button>
        <p className="text-center text-xs text-muted">Plans unlock after your first completed order.</p>
      </div>
    </form>
  );
}
