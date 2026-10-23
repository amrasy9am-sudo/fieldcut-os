import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice · Fieldcut" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-5 py-12 text-[15px] leading-relaxed">
      <h1 className="font-display text-4xl font-semibold">Privacy notice</h1>
      <p className="text-muted">Personal Data Protection Act 2010 (Malaysia) · Notis privasi dalam Bahasa Melayu boleh diminta melalui WhatsApp.</p>
      <h2 className="font-display text-xl font-semibold">What we collect</h2>
      <p>Your name, your mobile number, and — only if you choose delivery — your delivery area and address. We never ask for IC numbers, card details or bank details.</p>
      <h2 className="font-display text-xl font-semibold">Why</h2>
      <p>To prepare and deliver your order, to confirm it with you on WhatsApp, and to keep a record of orders for tax purposes.</p>
      <h2 className="font-display text-xl font-semibold">Who sees it</h2>
      <p>Only the Fieldcut kitchen team. Packers see your first name and order; riders see what they need to deliver. We don&apos;t sell or share your data.</p>
      <h2 className="font-display text-xl font-semibold">How long we keep it</h2>
      <p>Delivery addresses are removed after 12 months without an order. Order totals are kept for 7 years for tax records.</p>
      <h2 className="font-display text-xl font-semibold">Your rights</h2>
      <p>Message us on WhatsApp to see, correct or delete your details. We reply within 7 days.</p>
      <p className="text-sm text-muted">Your bag and details are also remembered on this device (browser storage) so ordering again is faster. Clearing your browser data removes them.</p>
    </article>
  );
}
