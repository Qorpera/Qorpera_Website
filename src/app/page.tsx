import type { Metadata } from "next";
import { LandingClient } from "./landing-client";
import { MarketingFooter } from "@/components/marketing-footer";

export const metadata: Metadata = {
  title: { absolute: "Qorpera — See Your Business Clearly" },
  description:
    "Every leader's view of their business is assembled from dashboards, meetings, and team updates — each one partial, each one delayed. Qorpera shows you the actual situations developing across every tool, directly.",
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
