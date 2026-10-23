"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/console";
import { Logo } from "../logo";
import { cx } from "../ui";

const OPERATE = [
  { href: "/console", label: "Today", icon: "◎" },
  { href: "/console/orders", label: "Orders", icon: "▤" },
  { href: "/console/production", label: "Production", icon: "✂" },
  { href: "/console/labels", label: "Labels", icon: "▭" },
  { href: "/console/routes", label: "Routes", icon: "➜" },
];
const MANAGE = [
  { href: "/console/customers", label: "Customers", icon: "☺" },
  { href: "/console/menu", label: "Menu & recipes", icon: "◐" },
  { href: "/console/capacity", label: "Capacity & calendar", icon: "▦" },
  { href: "/console/reports", label: "Reports", icon: "▲" },
];

/** Reads the current URL to highlight the active item; wrap in <Suspense> with <SidebarFrame path={null} />. */
export function Sidebar() {
  return <SidebarFrame path={usePathname()} />;
}

export function SidebarFrame({ path }: { path: string | null }) {
  const item = (l: { href: string; label: string; icon: string }) => {
    const on = path !== null && (l.href === "/console" ? path === "/console" : path.startsWith(l.href));
    return (
      <Link key={l.href} href={l.href}
        className={cx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
          on ? "bg-field text-white" : "text-[#B9C2B5] hover:bg-white/5 hover:text-white")}>
        <span className="w-4 text-center opacity-80" aria-hidden>{l.icon}</span>
        {l.label}
      </Link>
    );
  };
  return (
    <aside className="flex shrink-0 flex-col bg-loam p-3 text-oat print:hidden lg:sticky lg:top-0 lg:h-screen lg:w-60">
      <div className="px-2 py-3">
        <Logo href="/console" sub="Console" />
      </div>
      <nav className="mt-2 flex gap-1 overflow-x-auto lg:block lg:space-y-0.5">
        <p className="hidden px-3 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#7F8E80] lg:block">Operate</p>
        {OPERATE.map(item)}
        <p className="hidden px-3 pb-1 pt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#7F8E80] lg:block">Manage</p>
        {MANAGE.map(item)}
      </nav>
      <div className="mt-auto hidden space-y-2 px-2 pt-6 lg:block">
        <Link href="/" target="_blank" className="block text-xs font-bold text-[#B9C2B5] hover:text-white">Open storefront ↗</Link>
        <form action={logoutAction}>
          <button className="text-xs font-bold text-[#B9C2B5] hover:text-white">Sign out</button>
        </form>
      </div>
    </aside>
  );
}
