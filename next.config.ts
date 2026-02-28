import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

// In dev, Next.js HMR requires 'unsafe-eval' and 'unsafe-inline'.
// In production, strip 'unsafe-eval' — inline scripts are still needed for
// Next.js hydration chunks but eval is not.
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline' https://js.stripe.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/settings/connectors", destination: "/settings/connections", permanent: true },
      { source: "/settings/integrations", destination: "/settings/connections", permanent: true },
      { source: "/conversations", destination: "/settings/channels", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              "connect-src 'self' https://*.sentry.io https://api.stripe.com https://vitals.vercel-insights.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI output during build
  silent: true,
  // Upload source maps only when SENTRY_DSN is set (avoids errors in dev)
  sourcemaps: {
    disable: !process.env.SENTRY_DSN,
  },
  telemetry: false,
});
