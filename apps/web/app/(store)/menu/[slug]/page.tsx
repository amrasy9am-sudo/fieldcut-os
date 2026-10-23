import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BowlBuilder } from "@/components/bowl-builder";
import { Skeleton } from "@/components/ui";
import { requestNow } from "@/server/clock";
import { getMenu } from "@/server/repo";

async function Builder({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requestNow();
  const bowl = getMenu().find((b) => b.slug === slug);
  if (!bowl) notFound();
  if (!bowl.active) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center">
        <p className="font-display text-2xl font-semibold">{bowl.name} is sold out today</p>
        <Link href="/#menu" className="mt-3 inline-block font-bold text-field">See the other bowls →</Link>
      </div>
    );
  }
  return <BowlBuilder bowl={bowl} priceSen={bowl.priceSen} />;
}

export default function BowlPage({ params }: PageProps<"/menu/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Link href="/#menu" className="text-sm font-bold text-muted hover:text-loam">← All bowls</Link>
      <div className="mt-4">
        <Suspense fallback={<Skeleton className="h-[520px]" />}>
          <Builder params={params} />
        </Suspense>
      </div>
    </div>
  );
}
