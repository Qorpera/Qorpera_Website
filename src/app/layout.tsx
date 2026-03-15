import type { Metadata, Viewport } from "next";
import { DM_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import { MarketingShell } from "@/components/operator-shell";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafafa",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://qorpera.com"),
  icons: {
    icon: [
      { url: "/icon-dark.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-light.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
  title: {
    default: "Qorpera — AI that actually works inside your business",
    template: "%s | Qorpera",
  },
  description:
    "AI can do 85% of business operations tasks. It's doing 20%. The gap isn't intelligence — it's integration. Qorpera closes that gap.",
  openGraph: {
    type: "website",
    siteName: "Qorpera",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Qorpera" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
  verification: {
    google: "Y3xDcwJLFZX_tiGiNyYBdK5dktauRSlvVlCGok0-yqs",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${newsreader.variable}`}>
      <body>
        <MarketingShell>{children}</MarketingShell>
      </body>
    </html>
  );
}
