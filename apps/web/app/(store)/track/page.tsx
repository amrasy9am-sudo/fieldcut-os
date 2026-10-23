import type { Metadata } from "next";
import { TrackForm } from "@/components/track-form";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Track an order · Fieldcut" };

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-12">
      <h1 className="font-display text-4xl font-semibold">Track an order</h1>
      <p className="mt-1 text-muted">Your reference is in the WhatsApp message you sent us, e.g. FC-261102-K7M4R.</p>
      <Card className="mt-6 p-6">
        <TrackForm />
      </Card>
    </div>
  );
}
