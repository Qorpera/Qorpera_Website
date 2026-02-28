import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Only enable in production — avoids noise in local dev
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  // Capture unhandled promise rejections
  integrations: [],
});
