"use client";

import { useActionState, useState } from "react";
import { confirmOrderAction, type ConsoleState } from "@/actions/console";
import { buttonStyles, cx } from "../ui";

export function ConfirmForm({ orderRef, isDemo }: { orderRef: string; isDemo: boolean }) {
  const [state, action, pending] = useActionState<ConsoleState, FormData>(confirmOrderAction, null);
  const [override, setOverride] = useState(false);
  return (
    <form action={action} className="rounded-2xl bg-mist p-4">
      <input type="hidden" name="ref" value={orderRef} />
      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-muted" htmlFor="code">
        Verify code from the WhatsApp message
      </label>
      <div className="mt-2 flex gap-2">
        <input id="code" name="code" placeholder="XXXX-XXXX" autoComplete="off" maxLength={12}
          className="h-11 flex-1 rounded-xl border border-line bg-white px-3 font-mono text-lg font-bold uppercase tracking-widest outline-none focus:border-loam" />
        <button disabled={pending} className={buttonStyles.field}>{pending ? "Checking…" : "Verify & confirm"}</button>
      </div>
      {isDemo && <p className="mt-2 text-xs text-muted">Sample orders have no real code — they confirm without one.</p>}
      {state?.error && (
        <div className="mt-3 rounded-xl bg-[#F6D9D3] p-3 text-sm text-[#9B2F21]">
          <p className="font-bold">{state.error}</p>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
            I spoke to the customer — confirm anyway (logged)
          </label>
        </div>
      )}
      {(override || isDemo) && <input type="hidden" name="override" value={override || isDemo ? "1" : "0"} />}
      {state?.ok && <p className={cx("mt-3 rounded-xl bg-field p-3 text-sm font-bold text-white")}>{state.ok}</p>}
    </form>
  );
}
