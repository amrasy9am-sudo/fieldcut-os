import { BOWLS, type BowlSlug } from "@fieldcut/core";
import { BowlArt } from "../bowl-art";

export function BowlCounts({ counts }: { counts: Record<BowlSlug, number> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {BOWLS.map((b) => (
        <div key={b.slug} className="flex items-center gap-3 rounded-xl bg-oat p-3">
          <BowlArt protein={b.protein} size={44} />
          <div>
            <p className="text-[11px] font-bold text-muted">{b.shortName}</p>
            <p className="font-mono text-2xl font-bold leading-none">{counts[b.slug]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
