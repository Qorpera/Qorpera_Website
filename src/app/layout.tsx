import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1117",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://qorpera.com"),
  title: {
    default: "Qorpera — AI That Learns Your Business",
    template: "%s | Qorpera",
  },
  description:
    "Qorpera learns your customers, your products, and your way of working — then puts an AI team to work that handles support, sales, finance, and more around the clock.",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
