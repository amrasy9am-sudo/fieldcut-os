import { BowlArt } from "@/components/bowl-art";
import { Logo } from "@/components/logo";
import { BOWLS, KITCHEN_WHATSAPP, formatRM } from "@/lib/menu";

const STEPS = [
  { title: "Build your bowl", body: "Pick a bowl and dressing. Every portion is weighed to the gram." },
  { title: "Send on WhatsApp", body: "Your order arrives at our kitchen already formatted. We confirm it." },
  { title: "Pay on hand-over", body: "Cut at dawn, delivered by noon. Cash on delivery or pay at pick-up." },
];

export default function Home() {
  const featured = BOWLS[0];

  return (
    <main className="flex-1">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <span className="hidden rounded-full bg-[#FCE3C6] px-3 py-1 text-xs font-bold text-[#9A5410] sm:inline">
            Orders for tomorrow close at 10 pm
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 md:grid-cols-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-field">
            Pre-order · Seri Manjung · Sitiawan · Lumut
          </p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
            Cut at dawn.
            <br />
            <span className="font-normal italic text-field">Eaten by noon.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Four weighed salad bowls, made to order every morning. Order by 10 pm, we confirm on
            WhatsApp, and you pay when it arrives — no online payment.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#menu"
              className="rounded-xl bg-dawn px-5 py-3 font-bold text-loam transition hover:brightness-95"
            >
              See the menu
            </a>
            <a
              href={`https://wa.me/${KITCHEN_WHATSAPP}`}
              className="rounded-xl border border-line bg-white px-5 py-3 font-bold"
            >
              WhatsApp 014-243 4391
            </a>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-field">
            <li>✓ Weighed to the gram</li>
            <li>✓ Sealed &amp; labelled</li>
            <li>✓ Pay on hand-over</li>
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[380px]">
          <BowlArt protein={featured.protein} size={380} className="h-auto w-full" />
          <div className="absolute bottom-6 right-0 rounded-xl border border-line bg-white px-4 py-2 shadow-lg">
            <p className="font-mono text-sm font-bold">
              {featured.kcal} kcal · {featured.proteinG} g protein
            </p>
            <p className="text-xs text-muted">{featured.name}</p>
          </div>
        </div>
      </section>

      {/* Menu */}
      <section id="menu" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-3xl font-semibold">This week&apos;s bowls</h2>
          <p className="text-sm text-muted">750 ml · dressing in its own cup</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {BOWLS.map((bowl) => (
            <article
              key={bowl.slug}
              className="flex gap-4 rounded-2xl border border-line bg-white p-4 transition hover:shadow-md"
            >
              <div className="shrink-0">
                <BowlArt protein={bowl.protein} size={110} />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-field">
                  {bowl.tag}
                </span>
                <h3 className="font-display text-xl font-semibold">{bowl.name}</h3>
                <p className="mt-1 text-sm text-muted">{bowl.description}</p>
                <div className="mt-2 flex flex-wrap gap-2 font-mono text-xs">
                  <span className="rounded-full bg-mist px-2 py-0.5">{bowl.kcal} kcal</span>
                  <span className="rounded-full bg-mist px-2 py-0.5">{bowl.proteinG} g protein</span>
                  <span className="rounded-full bg-[#FCE3C6] px-2 py-0.5 text-[#9A5410]">
                    {bowl.dressing}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted">Contains: {bowl.allergens.join(", ")}</p>
                <span className="mt-auto pt-2 font-display text-2xl font-semibold">
                  {formatRM(bowl.priceSen)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-loam text-oat">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="font-display text-3xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
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

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-muted">
          <span>© Fieldcut Kitchen · Seri Manjung, Perak</span>
          <span className="font-mono">@fieldcut.kitchen · 014-243 4391</span>
        </div>
      </footer>
    </main>
  );
}
