"use client";

import type { DateOption, SlotAvailability } from "@fieldcut/core";
import { cx } from "./ui";

export function DateStrip({ options, value, onChange }: { options: DateOption[]; value: string; onChange: (d: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Delivery date">
      {options.map((o) => {
        const [wd, day, mon] = o.label.split(" ");
        const on = o.date === value;
        return (
          <button key={o.date} type="button" role="radio" aria-checked={on} disabled={!o.bookable} onClick={() => onChange(o.date)}
            className={cx("min-w-[68px] flex-1 rounded-xl border px-2 py-2 text-center transition",
              on ? "border-loam bg-loam text-white" : o.bookable ? "border-line bg-white hover:border-loam" : "border-transparent bg-[#EFEAE0] text-[#A9AFA7]")}>
            <span className="block text-[11px] font-bold">{wd}</span>
            <span className="block text-lg font-extrabold leading-tight">{day}</span>
            <span className="block text-[10px]">{o.reason ?? mon}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SlotCells({ slots, value, onChange, bowls }: { slots: SlotAvailability[]; value: number | null; onChange: (id: number) => void; bowls: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Delivery slot">
      {slots.map((s) => {
        const fits = s.left >= Math.max(1, bowls);
        const on = s.slotId === value;
        const used = s.capacity ? ((s.capacity - s.left) / s.capacity) * 100 : 100;
        return (
          <button key={s.slotId} type="button" role="radio" aria-checked={on} disabled={!fits} onClick={() => onChange(s.slotId)}
            className={cx("rounded-xl border p-3 text-left transition",
              on ? "border-2 border-loam bg-white" : fits ? "border-line bg-white hover:border-loam" : "border-dashed border-line bg-[#EFEAE0] text-[#A9AFA7]")}>
            <span className="flex justify-between font-mono text-sm font-bold">{s.label}{on && <span className="text-field">✓</span>}</span>
            <span className="my-2 block h-1.5 rounded-full bg-mist">
              <span className={cx("block h-1.5 rounded-full", s.state === "full" ? "bg-[#C9C2B3]" : s.state === "low" ? "bg-dawn" : "bg-sprout")}
                style={{ width: `${Math.max(4, used)}%` }} />
            </span>
            <span className={cx("text-xs font-bold", !fits ? "" : s.state === "low" ? "text-[#9A5410]" : "text-field")}>
              {s.left === 0 ? "Full" : fits ? `${s.left} bowl${s.left === 1 ? "" : "s"} left` : `Only ${s.left} left`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
