import Link from "next/link";
import { Suspense } from "react";
import { KITCHEN_WHATSAPP } from "@fieldcut/core";
import { BowlArt } from "@/components/bowl-art";
import { MenuGrid, MenuGridSkeleton } from "@/components/menu-grid";
import { SlotStrip, SlotStripSkeleton } from "@/components/slot-strip";
import { buttonStyles, Eyebrow } from "@/components/ui";

const STEPS = [
  { title: "Build your bowl", body: "Pick a bowl, swap the dressing, add egg or chicken. kcal and protein update as you go." },
  { title: "Book a slot", body: "Choose tomorrow or any day this week. You only see slots the kitchen can really make." },
  { title: "Send on WhatsApp", body: "Your order arrives at our kitchen already formatted, with a reference and verify code." },
  { title: "Pay on hand-over", body: "Cut at dawn, delivered by noon. Cash on delivery or pay at pick-up — nothing online." },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-8 pt-12 md:grid-cols-2">
        <div>
          <Eyebrow>Pre-order · Seri Manjung · Sitiawan · Lumut</Eyebrow>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
            Cut at dawn.
            <br />
            <span className="font-normal italic text-field">Eaten by noon.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Four weighed salad bowls, made to order every morning. Order by 10 pm, we confirm on WhatsApp, and you pay when it
            arrives — no online payment.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#menu" className={buttonStyles.dawn}>Build your bowl →</Link>
            <Link href="/plan" className={buttonStyles.ghost}>Five-day plan · RM72</Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-field">
            <li>✓ Weighed to the gram</li>
            <li>✓ Sealed &amp; labelled</li>
            <li>✓ Pay on hand-over</li>
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-[400px]">
          <BowlArt protein="chicken" size={400} className="h-auto w-full drop-shadow-xl" />
          <div className="absolute bottom-6 right-0 rounded-xl border border-line bg-white px-4 py-2 shadow-lg">
            <p className="font-mono text-sm font-bold">430 kcal · 38 g protein</p>
            <p className="text-xs text-muted">The Field Classic · cut this morning</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5">
        <Suspense fallback={<SlotStripSkeleton />}>
          <SlotStrip />
        </Suspense>
      </section>

      <section id="menu" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-3xl font-semibold">This week&apos;s bowls</h2>
          <p className="text-sm text-muted">750 ml · 235 g rainbow base · dressing in its own cup</p>
        </div>
        <Suspense fallback={<MenuGridSkeleton />}>
          <MenuGrid />
        </Suspense>
      </section>

      <section className="bg-loam text-oat">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <Eyebrow className="text-sprout">How it works</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-semibold">From first tap to sealed bowl</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl bg-[#26372D] p-5">
                <span className="font-mono text-sm font-bold text-dawn">0{i + 1}</span>
                <h3 className="mt-1 text-lg font-bold">{step.title}</h3>
                <p className="mt-1 text-sm text-[#B9C2B5]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl bg-field p-8 text-oat">
          <Eyebrow className="text-sprout">Five-day plan</Eyebrow>
          <p className="mt-2 font-display text-5xl font-semibold">RM72</p>
          <p className="mt-1 text-[#CFD8C9]">One bowl a day, Monday–Friday. Pick each day&apos;s bowl. Salmon days +RM8. Free delivery in Zones A &amp; B.</p>
          <Link href="/plan" className={`${buttonStyles.dawn} mt-5`}>Build my week →</Link>
        </div>
        <div className="space-y-3 text-sm text-muted">
          <p className="font-display text-2xl font-semibold text-loam">Questions?</p>
          <p>We deliver 11:00–14:00, Monday to Saturday, within 8 km of Seri Manjung. Orders for a day close at 22:00 the night before.</p>
          <a href={`https://wa.me/${KITCHEN_WHATSAPP}`} className={buttonStyles.ghost}>Message us on WhatsApp</a>
        </div>
      </section>
    </>
  );
}
