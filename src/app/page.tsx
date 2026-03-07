import type { Metadata } from "next";
import { LandingClient } from "./landing-client";
import { MarketingFooter } from "@/components/marketing-footer";

export const metadata: Metadata = {
  title: { absolute: "Qorpera — See Your Business Clearly" },
  description:
    "Your understanding of operations is assembled from reports, meetings, and whatever your team happens to surface. Qorpera gives you the full picture — every situation developing across every tool, with the context to understand what it means.",
  openGraph: {
    title: "Qorpera — See Your Business Clearly",
    description:
      "Walk into any meeting already knowing what matters. Or cancel it entirely — you already have the picture.",
    siteName: "Qorpera",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qorpera — See Your Business Clearly",
    description:
      "Walk into any meeting already knowing what matters. Or cancel it entirely — you already have the picture.",
  },
};

export default function HomePage() {
  return (
    <>
      <LandingClient />
      <MarketingFooter />
    </>
  );
}
