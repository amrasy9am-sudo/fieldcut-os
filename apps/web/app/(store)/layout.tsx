import Link from "next/link";
import { Suspense } from "react";
import { KITCHEN_WHATSAPP, KITCHEN_WHATSAPP_DISPLAY } from "@fieldcut/core";
import { CartLink } from "@/components/cart-link";
import { CutoffChip } from "@/components/cutoff-chip";
import { Logo } from "@/components/logo";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-oat/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-semibold text-muted lg:flex">
            <Link href="/#menu" className="hover:text-loam">Menu</Link>
            <Link href="/plan" className="hover:text-loam">Five-day plan</Link>
            <Link href="/track" className="hover:text-loam">Track order</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <CutoffChip />
            </Suspense>
            <CartLink />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 text-sm text-muted md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-2">Cut at dawn. Eaten by noon.</p>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-loam">Order rules</p>
            <p>Orders close 22:00 the night before · Mon–Sat</p>
            <p>Delivery within 8 km of Seri Manjung · RM25 minimum</p>
            <p>No online payment — settle on hand-over</p>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-loam">Contact</p>
            <a className="block hover:text-loam" href={`https://wa.me/${KITCHEN_WHATSAPP}`}>WhatsApp {KITCHEN_WHATSAPP_DISPLAY}</a>
            <Link className="block hover:text-loam" href="/track">Track an order</Link>
            <Link className="block hover:text-loam" href="/privacy">Privacy notice</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
