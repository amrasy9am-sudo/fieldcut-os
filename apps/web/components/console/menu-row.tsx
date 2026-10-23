"use client";

import { useActionState } from "react";
import { formatRM } from "@fieldcut/core";
import { updateMenuAction, type ConsoleState } from "@/actions/console";
import { buttonStyles, cx } from "../ui";

export function MenuRow({ slug, name, priceSen, active, cogsSen }: { slug: string; name: string; priceSen: number; active: boolean; cogsSen: number }) {
  const [state, action, pending] = useActionState<ConsoleState, FormData>(updateMenuAction, null);
  const margin = ((priceSen - cogsSen) / priceSen) * 100;
  return (
    <form action={action} className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto_auto] items-center gap-3 py-3 text-sm">
      <input type="hidden" name="slug" value={slug} />
      <span className="font-bold">{name}</span>
      <label className="flex items-center gap-1">
        <span className="text-muted">RM</span>
        <input name="price" defaultValue={(priceSen / 100).toFixed(2)} inputMode="decimal" aria-label={`${name} price`}
          className="h-9 w-20 rounded-lg border border-line px-2 font-mono" />
      </label>
      <span className="font-mono">{formatRM(cogsSen)}</span>
      <span className={cx("font-mono font-bold", margin >= 47 ? "text-field" : "text-radish")}>{margin.toFixed(0)}%</span>
      <label className="flex items-center gap-1.5 text-xs font-bold">
        <input type="checkbox" name="active" defaultChecked={active} className="h-4 w-4 accent-[#2E5B3B]" /> On sale
      </label>
      <button disabled={pending} className={cx(buttonStyles.small, "bg-loam text-white")}>{pending ? "…" : state?.ok ? "Saved ✓" : "Save"}</button>
      {state?.error && <p className="col-span-6 text-xs font-bold text-radish">{state.error}</p>}
    </form>
  );
}
