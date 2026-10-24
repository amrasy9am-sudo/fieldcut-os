import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const siteUrl =
  process.env.PUBLIC_BASE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Fieldcut Kitchen — Cut at dawn. Eaten by noon.",
  description:
    "Pre-order weighed salad bowls in Seri Manjung, Sitiawan and Lumut. Order by 10 pm, confirm on WhatsApp, pay on hand-over.",
  // Link previews (LinkedIn, WhatsApp). The image is app/opengraph-image.png, resolved against metadataBase.
  openGraph: {
    type: "website",
    siteName: "Fieldcut Kitchen",
    title: "Fieldcut OS · pre-order salad bowls with WhatsApp hand-off",
    description:
      "Build a bowl, book a slot the kitchen can really make, and send a tamper-evident order to WhatsApp. Live demo with the kitchen console.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
