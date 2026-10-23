import { Suspense } from "react";
import { formatDateShort, formatRM, KITCHEN_WHATSAPP_DISPLAY } from "@fieldcut/core";
import { DateNav } from "@/components/console/date-nav";
import { PageHeader } from "@/components/console/page-header";
import { PrintButton } from "@/components/console/print-button";
import { Skeleton } from "@/components/ui";
import { requireOwner } from "@/server/auth";
import { requestNow } from "@/server/clock";
import { getMenu, listOrdersForDate } from "@/server/repo";
import { pickDate, serviceDate } from "@/server/service-date";

const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** Eat-by is two hours after the end of the delivery slot (salads kept unchilled). */
function eatBy(slotEnd: string) {
  const [h, m] = slotEnd.split(":").map(Number);
  return `${String(h + 2).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function Labels({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireOwner();
  const now = await requestNow();
  const date = pickDate((await searchParams).date, serviceDate(now));
  const orders = listOrdersForDate(date, ["CONFIRMED", "IN_PREP", "PACKED"]);
  const allergens = new Map(getMenu().map((b) => [b.slug, b.allergens.join(", ")]));
  const labels = orders.flatMap((o, oi) => {
    const bowlsInOrder = o.items.flatMap((i) => Array.from({ length: i.qty }, () => i));
    return bowlsInOrder.map((item, bi) => ({ o, item, n: bi + 1, of: bowlsInOrder.length, stop: oi + 1 }));
  });
  return (
    <>
      <PageHeader title={`Labels · ${formatDateShort(date)}`} sub={`${labels.length} labels · 50 × 30 mm · one per bowl, in route order`}>
        <DateNav path="/console/labels" date={date} />
        <PrintButton />
      </PageHeader>
      {labels.length === 0 && <p className="text-sm text-muted print:hidden">No confirmed orders for this day.</p>}
      <div className="label-sheet grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:block">
        {labels.map(({ o, item, n, of, stop }) => (
          <div key={`${o.ref}-${n}`} className="label rounded-md border border-[#cfc8b8] bg-white p-3 text-[11px] leading-snug text-black">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-base font-semibold leading-none">fieldcut<span className="text-dawn">.</span></p>
                <p className="mt-1 text-[12px] font-extrabold uppercase">{item.name.replace(/^The /, "")}</p>
                <p className="text-[10px] text-[#444]">{item.detail}</p>
              </div>
              <div className="text-right font-mono">
                <p className="rounded bg-black px-1.5 font-bold text-white">{item.kcal} kcal est.</p>
                <p className="font-bold">{item.proteinG} g protein</p>
              </div>
            </div>
            <div className="my-1.5 border-t border-dashed border-[#999]" />
            <div className="grid grid-cols-2 gap-x-2 font-mono text-[10px]">
              <span>FOR: {o.name.split(" ")[0].toUpperCase()} {o.name.split(" ")[1]?.[0] ?? ""}.</span>
              <span>{o.ref}</span>
              <span>MADE: {ddmm(date)} 07:40</span>
              <span className="font-bold">EAT BY: {ddmm(date)} {eatBy(o.slotLabel.slice(-5))}</span>
              <span>SLOT: {o.slotLabel}{o.zone ? ` · ${o.zone}` : " · PICK-UP"}</span>
              <span>BAG {n}/{of} · STOP {stop}</span>
            </div>
            <p className="mt-1 text-[9px] text-[#444]">Keep ≤5 °C · Contains: {allergens.get(item.slug)} · {formatRM(o.totalSen)} due · {KITCHEN_WHATSAPP_DISPLAY}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export default function LabelsPage({ searchParams }: PageProps<"/console/labels">) {
  return (
    <Suspense fallback={<Skeleton className="h-[400px]" />}>
      <Labels searchParams={searchParams} />
    </Suspense>
  );
}
