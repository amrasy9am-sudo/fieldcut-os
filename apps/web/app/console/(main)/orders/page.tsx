import Link from "next/link";
import { Suspense } from "react";
import { formatDateShort, formatRM, type Status } from "@fieldcut/core";
import { AdvanceButtons } from "@/components/console/advance-buttons";
import { DateNav } from "@/components/console/date-nav";
import { PageHeader } from "@/components/console/page-header";
import { buttonStyles, cx, Skeleton, StatusBadge } from "@/components/ui";
import { requireOwner } from "@/server/auth";
import { requestNow } from "@/server/clock";
import { listOrdersForDate, type OrderView } from "@/server/repo";
import { pickDate, serviceDate } from "@/server/service-date";

const COLUMNS: { title: string; statuses: Status[]; tone: string }[] = [
  { title: "Awaiting WhatsApp", statuses: ["SUBMITTED"], tone: "border-l-4 border-l-dawn" },
  { title: "Confirmed", statuses: ["CONFIRMED"], tone: "" },
  { title: "In prep", statuses: ["IN_PREP"], tone: "" },
  { title: "Packed", statuses: ["PACKED"], tone: "" },
  { title: "Out · ready", statuses: ["OUT_FOR_DELIVERY", "READY_FOR_PICKUP"], tone: "" },
  { title: "Done", statuses: ["COMPLETED"], tone: "" },
];

function OrderCard({ o, tone }: { o: OrderView; tone: string }) {
  return (
    <div className={cx("rounded-xl border border-line bg-white p-3", tone)}>
      <Link href={`/console/orders/${o.ref}`} className="font-mono text-[11px] font-bold hover:underline">{o.ref}</Link>
      <p className="mt-0.5 text-sm font-bold">{o.name}{o.isDemo && <span className="ml-1 text-[10px] font-normal text-muted">sample</span>}</p>
      <p className="text-xs text-muted">{o.slotLabel} · {o.mode === "delivery" ? `Zone ${o.zone}` : "Pick-up"}</p>
      <p className="text-xs">{o.bowls} bowl{o.bowls > 1 ? "s" : ""} · <b>{formatRM(o.totalSen)}</b>{o.planRef && " · plan"}</p>
      <div className="mt-2">
        {o.status === "SUBMITTED" ? (
          <Link href={`/console/orders/${o.ref}`} className={cx(buttonStyles.small, "bg-field text-white")}>Verify &amp; confirm</Link>
        ) : (
          <AdvanceButtons orderRef={o.ref} status={o.status} mode={o.mode} compact />
        )}
      </div>
    </div>
  );
}

async function Board({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireOwner();
  const now = await requestNow();
  const date = pickDate((await searchParams).date, serviceDate(now));
  const orders = listOrdersForDate(date);
  const closed = orders.filter((o) => ["CANCELLED", "EXPIRED", "NO_SHOW"].includes(o.status));
  return (
    <>
      <PageHeader title={`Orders · ${formatDateShort(date)}`} sub={`${orders.length - closed.length} active · ${closed.length} closed`}>
        <DateNav path="/console/orders" date={date} />
      </PageHeader>
      <div className="grid gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {COLUMNS.map((c) => {
          const list = orders.filter((o) => c.statuses.includes(o.status));
          return (
            <section key={c.title} className="rounded-2xl bg-[#EFEAE0] p-2.5">
              <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-extrabold">
                {c.title}
                <span className="rounded-full bg-white px-2 py-0.5">{list.length}</span>
              </h2>
              <div className="space-y-2">
                {list.map((o) => <OrderCard key={o.ref} o={o} tone={c.tone} />)}
                {list.length === 0 && <p className="rounded-xl border-2 border-dashed border-line p-4 text-center text-xs text-muted">Empty</p>}
              </div>
            </section>
          );
        })}
      </div>
      {closed.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-bold text-muted">Closed</h2>
          <div className="flex flex-wrap gap-2">
            {closed.map((o) => (
              <Link key={o.ref} href={`/console/orders/${o.ref}`} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs">
                <span className="font-mono font-bold">{o.ref}</span> {o.name} <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function OrdersPage({ searchParams }: PageProps<"/console/orders">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Board searchParams={searchParams} />
    </Suspense>
  );
}
