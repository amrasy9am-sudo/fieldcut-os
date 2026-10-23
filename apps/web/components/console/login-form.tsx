"use client";

import { useActionState } from "react";
import { loginAction, type ConsoleState } from "@/actions/console";
import { buttonStyles, cx } from "../ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<ConsoleState, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-muted">Password</span>
        <input type="password" name="password" autoComplete="current-password" required autoFocus
          className="h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-loam" />
      </label>
      {state?.error && <p role="alert" className="text-sm font-bold text-radish">{state.error}</p>}
      <button disabled={pending} className={cx(buttonStyles.primary, "w-full")}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
