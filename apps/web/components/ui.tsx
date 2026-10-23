import type { ReactNode } from "react";
import { label as statusLabel, type Status } from "@fieldcut/core";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const STATUS_STYLE: Record<Status, string> = {
  SUBMITTED: "bg-[#FCE3C6] text-[#9A5410]",
  CONFIRMED: "bg-mist text-field",
  IN_PREP: "bg-[#DDE8F3] text-[#24507A]",
  PACKED: "bg-[#DDE8F3] text-[#24507A]",
  OUT_FOR_DELIVERY: "bg-loam text-white",
  READY_FOR_PICKUP: "bg-loam text-white",
  COMPLETED: "bg-field text-white",
  EXPIRED: "bg-[#F1ECE2] text-muted",
  CANCELLED: "bg-[#F6D9D3] text-[#9B2F21]",
  NO_SHOW: "bg-[#F6D9D3] text-[#9B2F21]",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cx("inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold", STATUS_STYLE[status])}>
      {statusLabel(status)}
    </span>
  );
}

const TIER_STYLE = {
  new: "border border-line bg-white text-loam",
  regular: "bg-mist text-field",
  trusted: "bg-[#FCE3C6] text-[#9A5410]",
  paused: "bg-[#F6D9D3] text-[#9B2F21]",
} as const;

export function TierBadge({ tier }: { tier: keyof typeof TIER_STYLE }) {
  return (
    <span className={cx("inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold capitalize", TIER_STYLE[tier])}>{tier}</span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-line bg-white", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-[11px] font-extrabold uppercase tracking-[0.16em] text-field", className)}>{children}</p>;
}

export const buttonStyles = {
  primary: "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-loam px-5 text-sm font-bold text-white transition hover:bg-[#2a3b31] disabled:opacity-50",
  dawn: "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-dawn px-5 text-sm font-bold text-loam transition hover:brightness-95 disabled:opacity-50",
  field: "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-field px-5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50",
  ghost: "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-loam transition hover:bg-oat disabled:opacity-50",
  whatsapp: "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1F8A4C] px-6 text-base font-bold text-white transition hover:brightness-110",
  small: "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition disabled:opacity-50",
};

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-[#ECE6DA]", className)} />;
}
