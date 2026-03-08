import type { Metadata } from "next";
import { LandingClient } from "./landing-client";
import { MarketingFooter } from "@/components/marketing-footer";

export const metadata: Metadata = {
  title: { absolute: "Qorpera — AI that actually works inside your business" },
  description:
    "AI can do 85% of business operations tasks. It's doing 20%. The gap isn't intelligence — it's integration. Qorpera closes that gap.",
  openGraph: {
    title: "Qorpera — AI that actually works inside your business",
    description:
      "Qorpera teaches AI how your company works, connects it to your tools, and gradually lets it take over the tasks your team shouldn't be doing manually.",
    siteName: "Qorpera",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qorpera — AI that actually works inside your business",
    description:
      "Qorpera teaches AI how your company works, connects it to your tools, and gradually lets it take over the tasks your team shouldn't be doing manually.",
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
