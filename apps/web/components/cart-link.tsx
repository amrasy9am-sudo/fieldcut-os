"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const lines = useCart();
  const count = lines.reduce((s, l) => s + l.qty, 0);
  return (
    <Link
      href="/checkout"
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-loam px-4 text-sm font-bold text-white transition hover:bg-[#2a3b31]"
    >
      Bag
      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-dawn px-1 text-[11px] text-loam">{count}</span>
    </Link>
  );
}
