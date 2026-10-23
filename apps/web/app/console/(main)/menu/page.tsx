import { Suspense } from "react";
import { ADDONS, BASE_BOM, DRESSINGS, formatRM, INGREDIENTS, PACKAGING_SEN, type AddOnId } from "@fieldcut/core";
import { MenuRow } from "@/components/console/menu-row";
import { PageHeader } from "@/components/console/page-header";
import { Card, Skeleton } from "@/components/ui";
import { requireOwner } from "@/server/auth";
import { requestNow } from "@/server/clock";
import { getMenu } from "@/server/repo";

const qty = (q: number, unit: "g" | "pc") => (unit === "g" ? `${q} g` : `${q} pc`);

async function Menu() {
  await requireOwner();
  await requestNow();
  const menu = getMenu();
  return (
    <>
      <PageHeader title="Menu & recipes" sub="Prices and availability update the storefront immediately. Costs come from each bowl's bill of materials." />
      <Card className="p-5">
        <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto_auto] gap-3 border-b border-loam pb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted">
          <span>Bowl</span><span>Price</span><span>Cost (COGS)</span><span>Margin</span><span /><span />
        </div>
        <div className="divide-y divide-line">
          {menu.map((b) => <MenuRow key={b.slug} slug={b.slug} name={b.name} priceSen={b.priceSen} active={b.active} cogsSen={b.cogsSen} />)}
        </div>
        <p className="mt-3 text-xs text-muted">Target margin ≥ 47% after packaging ({formatRM(PACKAGING_SEN)} per bowl). Never discount a single bowl below RM14.90.</p>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {menu.map((b) => (
          <Card key={b.slug} className="p-5">
            <h2 className="font-bold">{b.name} · bill of materials</h2>
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-line">
                {[...b.toppings, ...BASE_BOM].map((l, i) => (
                  <tr key={i}><td className="py-1">{INGREDIENTS[l.ingredient].name}{i >= b.toppings.length && <span className="text-xs text-muted"> · base</span>}</td><td className="py-1 text-right font-mono">{qty(l.qty, INGREDIENTS[l.ingredient].unit)}</td></tr>
                ))}
                <tr><td className="py-1">{DRESSINGS[b.dressing].name} cup</td><td className="py-1 text-right font-mono">30 ml</td></tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">{b.kcal} kcal (est.) · {b.proteinG} g protein · contains {b.allergens.join(", ")}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-5 p-5">
        <h2 className="font-bold">Add-ons</h2>
        <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {(Object.keys(ADDONS) as AddOnId[]).map((id) => (
            <li key={id} className="flex justify-between rounded-lg bg-oat px-3 py-2"><span>{ADDONS[id].name}</span><span className="font-mono">{formatRM(ADDONS[id].priceSen)}</span></li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Recipes, add-ons and ingredient prices live in <span className="font-mono">packages/core/src/catalog.ts</span> so the storefront, labels, prep list and costing always agree.</p>
      </Card>
    </>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Menu />
    </Suspense>
  );
}
