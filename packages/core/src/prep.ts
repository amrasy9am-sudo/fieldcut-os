import { ADDONS, BASE_BOM, BOWLS, DRESSINGS, getBowl, INGREDIENTS, WASTE_FACTOR, type AddOnId, type BowlSlug, type DressingCode, type IngredientId } from "./catalog.ts";
import type { LineInput } from "./pricing.ts";

export type PrepLine = { id: IngredientId; name: string; unit: "g" | "pc"; qty: number; station: string };

export type PrepPlan = {
  bowls: Record<BowlSlug, number>;
  totalBowls: number;
  ingredients: PrepLine[];
  dressingCups: Record<DressingCode, number>;
};

/**
 * Explodes order lines through each bowl's bill of materials into a weighed prep list.
 * Grams get a 5% trim allowance and are rounded up; pieces are rounded up.
 */
export function explode(lines: LineInput[]): PrepPlan {
  const bowls = Object.fromEntries(BOWLS.map((b) => [b.slug, 0])) as Record<BowlSlug, number>;
  const cups: Record<DressingCode, number> = { HM: 0, RS: 0, LY: 0 };
  const need = new Map<IngredientId, number>();
  const add = (id: IngredientId, qty: number) => need.set(id, (need.get(id) ?? 0) + qty);

  for (const line of lines) {
    const bowl = getBowl(line.slug);
    if (!bowl) continue;
    bowls[line.slug] += line.qty;
    cups[line.dressing] += line.qty;
    for (const b of BASE_BOM) {
      if ((line.leaveOut as string[]).includes(b.ingredient)) continue;
      add(b.ingredient, b.qty * line.qty);
    }
    for (const t of bowl.toppings) add(t.ingredient, t.qty * line.qty);
    for (const [id, n] of Object.entries(line.addOns) as [AddOnId, number][]) {
      if (id === "extra-dressing") cups[line.dressing] += n * line.qty;
      for (const b of ADDONS[id].bom) add(b.ingredient, b.qty * n * line.qty);
    }
  }

  const ingredients: PrepLine[] = [...need.entries()]
    .map(([id, qty]) => {
      const ing = INGREDIENTS[id];
      const withTrim = ing.unit === "g" ? Math.ceil(qty * WASTE_FACTOR) : Math.ceil(qty);
      return { id, name: ing.name, unit: ing.unit, qty: withTrim, station: ing.station };
    })
    .sort((a, b) => a.station.localeCompare(b.station) || b.qty - a.qty);

  return {
    bowls,
    totalBowls: Object.values(bowls).reduce((s, n) => s + n, 0),
    ingredients,
    dressingCups: cups,
  };
}

export function formatQty(line: Pick<PrepLine, "qty" | "unit">): string {
  if (line.unit === "pc") return `${line.qty} pcs`;
  return line.qty >= 1000 ? `${(line.qty / 1000).toFixed(2)} kg` : `${line.qty} g`;
}

export function dressingName(code: DressingCode): string {
  return DRESSINGS[code].name;
}
