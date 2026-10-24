import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/console/login-form";
import { Logo } from "@/components/logo";
import { consolePassword, usingDevPassword } from "@/server/auth";
import { isDemo } from "@/server/demo";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Sign in · Fieldcut console", robots: { index: false } };

async function DevHint() {
  await connection();
  if (isDemo()) {
    return (
      <p className="mt-4 rounded-xl bg-[#E4EEDF] p-3 text-xs text-field">
        Live demo: the password is <b className="font-mono">{consolePassword()}</b>. Sample orders reload whenever the demo restarts.
      </p>
    );
  }
  return usingDevPassword() ? (
    <p className="mt-4 rounded-xl bg-[#FCE3C6] p-3 text-xs text-[#9A5410]">
      Development mode: the password is <b className="font-mono">fieldcut</b>. Set <span className="font-mono">CONSOLE_PASSWORD</span> in <span className="font-mono">.env.local</span> before going live.
    </p>
  ) : null;
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-loam p-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
        <Logo href="/" sub="Console" />
        <h1 className="mt-5 font-display text-2xl font-semibold">Kitchen console</h1>
        <p className="text-sm text-muted">Staff only. Customers never need an account.</p>
        <div className="mt-5">
          <LoginForm />
        </div>
        <Suspense fallback={null}>
          <DevHint />
        </Suspense>
      </div>
    </div>
  );
}
