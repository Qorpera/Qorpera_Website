import type { Metadata, Viewport } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";
import { MarketingShell } from "@/components/operator-shell";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-heading",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080c10",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://qorpera.com"),
  title: {
    default: "Qorpera — Map Your Company. Build Secure AI for Operations.",
    template: "%s | Qorpera",
  },
  description:
    "Qorpera maps your business entities, builds governance layers, and deploys secure AI that reasons and acts within permission-aware, fully auditable boundaries.",
  openGraph: {
    type: "website",
    siteName: "Qorpera",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Qorpera" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${ebGaramond.variable}`}>
      <body className="bg-[rgb(8,12,16)] text-zinc-100">
        <MarketingShell>{children}</MarketingShell>
      </body>
    </html>
  );
}
