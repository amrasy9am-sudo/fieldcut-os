import { Suspense } from "react";
import { displayPhone, formatDateShort, formatRM, TIER_LABELS, type Tier } from "@fieldcut/core";
import { Kpi, PageHeader } from "@/components/console/page-header";
import { Card, Skeleton, TierBadge } from "@/components/ui";
import { requireOwner } from "@/server/auth";
import { requestNow } from "@/server/clock";
import { listCustomers } from "@/server/repo";

const mask = (phone: string) => displayPhone(phone).replace(/(\d{3}-)\d+( ?)(\d*)(\d{4})$/, (_m, a, sp, _b, last) => `${a}••••${sp}${last}`);

async function Customers() {
  await requireOwner();
  const now = await requestNow();
  const customers = listCustomers(now);
  const count = (t: Tier) => customers.filter((c) => c.tier === t).length;
  return (
    <>
      <PageHeader title="Customers" sub="Phone numbers are masked. Tiers come from each customer's own history." />
      <div className="grid gap-3 sm:grid-cols-4">
        {(["new", "regular", "trusted", "paused"] as Tier[]).map((t) => <Kpi key={t} label={TIER_LABELS[t]} value={count(t)} />)}
      </div>
      <Card className="mt-5 overflow-x-auto p-5">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-[10px] uppercase tracking-wider text-muted">
            <tr><th className="pb-2">Customer</th><th>Tier</th><th>Orders</th><th>Completed</th><th>No-shows</th><th>Spent</th><th>Last order</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="py-2"><b>{c.name}</b><span className="block font-mono text-[11px] text-muted">{mask(c.phone)}</span></td>
                <td><TierBadge tier={c.tier} /></td>
                <td className="font-mono">{c.orders}</td>
                <td className="font-mono">{c.completed}</td>
                <td className="font-mono">{c.no_shows}</td>
                <td className="font-mono">{formatRM(c.spent_sen)}</td>
                <td>{c.last_date ? formatDateShort(c.last_date) : "—"}</td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted">No customers yet.</td></tr>}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">Tier rules: New (0 completed) · Regular (1+ completed) · Trusted (5+ completed, no no-shows in 60 days) · Paused (2 no-shows in 60 days). PDPA requests: export or erase a customer on request.</p>
      </Card>
    </>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[500px]" />}>
      <Customers />
    </Suspense>
  );
}
