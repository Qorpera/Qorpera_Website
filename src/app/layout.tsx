import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://qorpera.com"),
  title: {
    default: "Qorpera — AI Workforce Platform",
    template: "%s | Qorpera",
  },
  description:
    "Deploy AI agents that execute real work inside projects — with permissions, approvals, audit trails, and hybrid local/cloud orchestration.",
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
