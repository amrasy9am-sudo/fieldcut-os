import type { Metadata } from "next";
import { Suspense } from "react";
import { dateOptions } from "@fieldcut/core";
import { CheckoutForm } from "@/components/checkout-form";
import { Skeleton } from "@/components/ui";
import { requestNow } from "@/server/clock";
import { availabilityFor, closedDates, getMenu } from "@/server/repo";

export const metadata: Metadata = { title: "Checkout · Fieldcut" };

async function Checkout() {
  const now = await requestNow();
  const options = dateOptions(now, closedDates());
  const availability = Object.fromEntries(options.filter((o) => o.bookable).map((o) => [o.date, availabilityFor(o.date)]));
  const menu = getMenu();
  return (
    <CheckoutForm
      options={options}
      availability={availability}
      prices={Object.fromEntries(menu.map((b) => [b.slug, b.priceSen]))}
      soldOut={menu.filter((b) => !b.active).map((b) => b.slug)}
    />
  );
}

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="font-display text-4xl font-semibold">Checkout</h1>
      <p className="mt-1 text-muted">Three steps: your details, a slot, then send it to us on WhatsApp.</p>
      <div className="mt-6">
        <Suspense fallback={<Skeleton className="h-[600px]" />}>
          <Checkout />
        </Suspense>
      </div>
    </div>
  );
}
