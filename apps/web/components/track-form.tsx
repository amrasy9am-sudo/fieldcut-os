"use client";

import { useActionState } from "react";
import { trackAction, type TrackState } from "@/actions/store";
import { buttonStyles, cx } from "./ui";

export function TrackForm({ defaultRef = "" }: { defaultRef?: string }) {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackAction, null);
  const input = "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-loam";
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-muted">Order reference</span>
        <input name="ref" defaultValue={defaultRef} placeholder="FC-261102-K7M4R" className={cx(input, "font-mono uppercase")} required />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-muted">Last 4 digits of your phone number</span>
        <input name="last4" inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="6789" className={cx(input, "font-mono")} required />
      </label>
      {state?.error && <p role="alert" className="text-sm font-bold text-radish">{state.error}</p>}
      <button type="submit" disabled={pending} className={cx(buttonStyles.primary, "w-full")}>{pending ? "Checking…" : "Show my order"}</button>
    </form>
  );
}
