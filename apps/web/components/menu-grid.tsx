import Link from "next/link";
import { DRESSINGS, formatRM } from "@fieldcut/core";
import { requestNow } from "@/server/clock";
import { getMenu } from "@/server/repo";
import { BowlArt } from "./bowl-art";
import { Skeleton } from "./ui";

export async function MenuGrid() {
  await requestNow();
  const menu = getMenu();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {menu.map((bowl) => (
        <Link
          key={bowl.slug}
          href={`/menu/${bowl.slug}`}
          aria-disabled={!bowl.active}
          className={`group flex gap-4 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${bowl.active ? "" : "pointer-events-none opacity-55"}`}
        >
          <div className="shrink-0 transition group-hover:rotate-6">
            <BowlArt protein={bowl.protein} size={112} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-field">{bowl.active ? bowl.tag : "Sold out today"}</span>
            <h3 className="font-display text-xl font-semibold">{bowl.name}</h3>
            <p className="mt-1 text-sm text-muted">{bowl.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
              <span className="rounded-full bg-mist px-2 py-0.5">{bowl.kcal} kcal</span>
              <span className="rounded-full bg-mist px-2 py-0.5">{bowl.proteinG} g protein</span>
              <span className="rounded-full bg-[#FCE3C6] px-2 py-0.5 text-[#9A5410]">{DRESSINGS[bowl.dressing].name}</span>
            </div>
            <p className="mt-2 text-xs text-muted">Contains: {bowl.allergens.join(", ")}</p>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="font-display text-2xl font-semibold">{formatRM(bowl.priceSen)}</span>
              <span className="rounded-lg bg-loam px-3 py-1.5 text-xs font-bold text-white">Customise →</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function MenuGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48" />
      ))}
    </div>
  );
}
