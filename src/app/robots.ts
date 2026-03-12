import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qorpera.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/platform",
          "/how-it-works",
          "/use-cases",
          "/vision",
          "/contact",
          "/documents",
        ],
        disallow: [
          "/_next/static/media/",
          "/api/",
          "/settings",
          "/agents",
          "/projects",
          "/inbox",
          "/metrics",
          "/onboarding",
          "/profile",
          "/results",
          "/business-logs",
          "/company-soul",
          "/optimizer",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
