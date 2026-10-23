"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ADDONS, DRESSINGS, formatRM, LEAVE_OUTS, priceLine,
  type AddOnId, type Bowl, type DressingCode, type LeaveOutId,
} from "@fieldcut/core";
import { cart } from "@/lib/cart";
import { BowlArt } from "./bowl-art";
import { buttonStyles, cx } from "./ui";

function Stepper({ value, onChange, max, label }: { value: number; onChange: (n: number) => void; max: number; label: string }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" aria-label={`Fewer ${label}`} disabled={value === 0} onClick={() => onChange(value - 1)}
        className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white font-bold disabled:opacity-40">−</button>
      <span className="w-5 text-center font-mono font-bold" aria-live="polite">{value}</span>
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}
        className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white font-bold disabled:opacity-40">+</button>
    </div>
  );
}

export function BowlBuilder({ bowl, priceSen }: { bowl: Bowl; priceSen: number }) {
  const [dressing, setDressing] = useState<DressingCode>(bowl.dressing);
  const [addOns, setAddOns] = useState<Partial<Record<AddOnId, number>>>({});
  const [leaveOut, setLeaveOut] = useState<LeaveOutId[]>([]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const cleanAddOns = useMemo(
    () => Object.fromEntries(Object.entries(addOns).filter(([, n]) => (n ?? 0) > 0)) as Partial<Record<AddOnId, number>>,
    [addOns],
  );
  const line = { slug: bowl.slug, qty, dressing, addOns: cleanAddOns, leaveOut };
  const priced = priceLine(line, { [bowl.slug]: priceSen });
  const base = priceLine({ slug: bowl.slug, qty: 1, dressing: bowl.dressing, addOns: {}, leaveOut: [] }, { [bowl.slug]: priceSen });
  const dk = priced.kcal - base.kcal;
  const dp = priced.proteinG - base.proteinG;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
      <div className="md:sticky md:top-24 md:self-start">
        <div className="mx-auto w-full max-w-[360px]">
          <BowlArt protein={bowl.protein} size={360} className="h-auto w-full drop-shadow-xl" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">kcal (est.)</p>
            <p className="font-mono text-2xl font-bold">
              {priced.kcal} {dk !== 0 && <span className={cx("text-sm", dk > 0 ? "text-[#9A5410]" : "text-field")}>{dk > 0 ? `+${dk}` : dk}</span>}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Protein</p>
            <p className="font-mono text-2xl font-bold">
              {priced.proteinG} g {dp > 0 && <span className="text-sm text-field">+{dp}</span>}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-field">{bowl.tag}</p>
        <h1 className="font-display text-4xl font-semibold">{bowl.name}</h1>
        <p className="mt-2 text-muted">{bowl.description}</p>
        <p className="mt-1 text-sm text-muted">235 g rainbow base · weighed protein · 30 ml dressing in its own cup</p>

        <fieldset className="mt-6">
          <legend className="text-xs font-extrabold uppercase tracking-wider text-muted">Dressing</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(DRESSINGS) as DressingCode[]).map((code) => (
              <button key={code} type="button" onClick={() => setDressing(code)} aria-pressed={dressing === code}
                className={cx("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition",
                  dressing === code ? "border-loam bg-loam text-white" : "border-line bg-white hover:border-loam")}>
                <span className="h-3 w-3 rounded-full" style={{ background: DRESSINGS[code].color }} />
                {DRESSINGS[code].name}
                {code === bowl.dressing && <span className="text-[10px] opacity-70">· house pick</span>}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-xs font-extrabold uppercase tracking-wider text-muted">Add-ons</legend>
          <div className="mt-2 divide-y divide-line rounded-2xl border border-line bg-white">
            {(Object.keys(ADDONS) as AddOnId[]).map((id) => (
              <div key={id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-bold">{ADDONS[id].name}</p>
                  <p className="text-xs text-muted">
                    +{formatRM(ADDONS[id].priceSen)}
                    {ADDONS[id].proteinG > 0 && ` · +${ADDONS[id].proteinG} g protein`}
                  </p>
                </div>
                <Stepper label={ADDONS[id].name} max={ADDONS[id].maxQty} value={addOns[id] ?? 0}
                  onChange={(n) => setAddOns((a) => ({ ...a, [id]: n }))} />
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-xs font-extrabold uppercase tracking-wider text-muted">Leave out</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEAVE_OUTS.map((l) => {
              const on = leaveOut.includes(l.id);
              return (
                <button key={l.id} type="button" aria-pressed={on}
                  onClick={() => setLeaveOut((x) => (on ? x.filter((y) => y !== l.id) : [...x, l.id]))}
                  className={cx("h-9 rounded-full border px-4 text-sm font-bold transition",
                    on ? "border-radish bg-[#F6D9D3] text-[#9B2F21] line-through" : "border-line bg-white hover:border-loam")}>
                  {l.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className="mt-4 text-sm text-muted">Contains: {bowl.allergens.join(", ")}{dressing !== bowl.dressing && " · check the dressing's allergens"}</p>

        <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t border-line bg-oat py-4">
          <Stepper label="bowls" max={10} value={qty} onChange={(n) => setQty(Math.max(1, n))} />
          <button type="button" className={cx(buttonStyles.dawn, "h-12 flex-1 text-base")}
            onClick={() => {
              cart.add(line);
              setAdded(true);
            }}>
            Add to bag · {formatRM(priced.lineSen)}
          </button>
        </div>
        {added && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-field p-4 text-white">
            <span className="font-bold">Added to your bag ✓</span>
            <span className="flex gap-2">
              <Link href="/#menu" className={cx(buttonStyles.small, "bg-white/15 text-white")}>Add another bowl</Link>
              <Link href="/checkout" className={cx(buttonStyles.small, "bg-dawn text-loam")}>Go to checkout →</Link>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
