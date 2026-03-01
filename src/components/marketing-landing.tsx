import { MarketingLandingClient } from "./marketing-landing-client";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Qorpera",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Hire pre-built AI workers that learn your business and replace real roles — support, sales, finance, operations — at a fraction of the cost of a single employee.",
  url: "https://qorpera.com",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "299",
    offerCount: "3",
  },
};

export function MarketingLanding() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <MarketingLandingClient />
    </div>
  );
}
