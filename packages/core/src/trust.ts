import type { Sen } from "./money.ts";

export type Tier = "new" | "regular" | "trusted" | "paused";

export type CustomerStats = { completed: number; noShowsLast60Days: number };

export function tierFor(s: CustomerStats): Tier {
  if (s.noShowsLast60Days >= 2) return "paused";
  if (s.completed >= 5 && s.noShowsLast60Days === 0) return "trusted";
  if (s.completed >= 1) return "regular";
  return "new";
}

export type TierLimits = { maxOrderSen: Sen; maxOpenOrders: number; plans: boolean };

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  new: { maxOrderSen: 6000, maxOpenOrders: 1, plans: false },
  regular: { maxOrderSen: 15000, maxOpenOrders: 3, plans: true },
  trusted: { maxOrderSen: 40000, maxOpenOrders: 10, plans: true },
  paused: { maxOrderSen: 0, maxOpenOrders: 0, plans: false },
};

export const TIER_LABELS: Record<Tier, string> = { new: "New", regular: "Regular", trusted: "Trusted", paused: "Paused" };

/** Returns a customer-facing reason when an order isn't allowed for this tier, or null when it is. */
export function checkTierLimits(input: { tier: Tier; orderTotalSen: Sen; openOrders: number; isPlan: boolean }): string | null {
  const limits = TIER_LIMITS[input.tier];
  if (input.tier === "paused") {
    return "Online ordering is paused for this number after two missed deliveries. Message us on WhatsApp and we'll sort it out.";
  }
  if (input.isPlan && !limits.plans) {
    return "Five-day plans unlock after your first completed order.";
  }
  if (input.openOrders >= limits.maxOpenOrders) {
    return input.tier === "new"
      ? "First-time customers can have one open order at a time. Message us on WhatsApp if you need more."
      : `You already have ${input.openOrders} open orders. Please wait for one to be delivered.`;
  }
  if (input.orderTotalSen > limits.maxOrderSen) {
    return input.tier === "new"
      ? "First orders are limited to RM60. For bigger or office orders, message us on WhatsApp."
      : `Orders are limited to RM${limits.maxOrderSen / 100} for your account. Message us on WhatsApp for larger orders.`;
  }
  return null;
}
