"use client";

import { AREAS, formatRM, ZONES, type FulfilmentMode } from "@fieldcut/core";
import { cx } from "./ui";

export type Details = { name: string; phone: string; mode: FulfilmentMode; area: string; address: string; notes: string };

const input = "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-loam focus:ring-2 focus:ring-loam/10";

export function Field({ label, children, error, hint }: { label: string; children: React.ReactNode; error?: boolean; hint?: string }) {
  return (
    <label className="block">
      <span className={cx("mb-1 block text-xs font-bold", error ? "text-radish" : "text-muted")}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

/** Name, WhatsApp number, delivery or pick-up, area and address — shared by checkout and the plan builder. */
export function DetailsFields({ value, onChange, errorField, planFees = false }: {
  value: Details; onChange: (d: Details) => void; errorField?: string; planFees?: boolean;
}) {
  const set = (patch: Partial<Details>) => onChange({ ...value, ...patch });
  const area = AREAS.find((a) => a.id === value.area);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" error={errorField === "name"}>
          <input name="name" className={input} autoComplete="name" value={value.name} onChange={(e) => set({ name: e.target.value })} required maxLength={60} />
        </Field>
        <Field label="WhatsApp number" error={errorField === "phone"} hint="We confirm your order here.">
          <div className="flex">
            <span className="grid h-11 place-items-center rounded-l-xl border border-r-0 border-line bg-oat px-3 text-sm text-muted">+60</span>
            <input name="phone" className={cx(input, "rounded-l-none")} inputMode="tel" autoComplete="tel" placeholder="12-345 6789"
              value={value.phone} onChange={(e) => set({ phone: e.target.value })} required maxLength={20} />
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Delivery or pick-up">
        {(["delivery", "pickup"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={value.mode === m} onClick={() => set({ mode: m })}
            className={cx("h-11 rounded-xl border text-sm font-bold transition", value.mode === m ? "border-loam bg-loam text-white" : "border-line bg-white")}>
            {m === "delivery" ? "Delivery" : "Self pick-up · free"}
          </button>
        ))}
      </div>
      <input type="hidden" name="mode" value={value.mode} />

      {value.mode === "delivery" ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
          <Field label="Area" error={errorField === "area"}>
            <select name="area" className={input} value={value.area} onChange={(e) => set({ area: e.target.value })} required>
              <option value="">Choose your area…</option>
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.zone ? ` · Zone ${a.zone}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Address" error={errorField === "address"}>
            <input name="address" className={input} autoComplete="street-address" placeholder="House no., street, taman"
              value={value.address} onChange={(e) => set({ address: e.target.value })} maxLength={200} />
          </Field>
          {area && (
            <p className={cx("rounded-xl px-3 py-2 text-sm sm:col-span-2", area.zone ? "bg-mist" : "bg-[#F6D9D3] text-[#9B2F21]")}>
              {area.zone
                ? planFees
                  ? `Zone ${area.zone} (${ZONES[area.zone].label}) · delivery ${ZONES[area.zone].planFeeSen ? `${formatRM(ZONES[area.zone].planFeeSen)} a day` : "free on plans"}`
                  : `Zone ${area.zone} (${ZONES[area.zone].label}) · delivery ${formatRM(ZONES[area.zone].feeSen)} · RM25 minimum`
                : "That's outside our 8 km delivery radius. Please choose self pick-up."}
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-xl bg-mist px-3 py-2 text-sm">Pick up from our kitchen in Seri Manjung. We send the exact location on WhatsApp when we confirm.</p>
      )}

      <Field label="Note for the kitchen or rider (optional)">
        <input name="notes" className={input} placeholder="e.g. leave at the guardhouse" value={value.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={160} />
      </Field>
    </div>
  );
}
