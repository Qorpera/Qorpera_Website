/**
 * Next.js instrumentation hook — runs once at server startup before any requests.
 * Hard-fails on truly fatal missing vars; warns on others so misconfiguration
 * is visible in logs without taking down the whole server.
 */
export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  // ── Hard requirements (crash if missing) ──────────────────────────
  if (!process.env.DATABASE_URL) {
    throw new Error("[qorpera] DATABASE_URL is required");
  }

  const appSecret = process.env.APP_SECRET || process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!appSecret || appSecret.trim().length < 16) {
    throw new Error("[qorpera] APP_SECRET (or CREDENTIAL_ENCRYPTION_KEY) must be set (≥16 chars)");
  }

  // ── Soft warnings (log but don't crash) ───────────────────────────
  const warn = (msg: string) => process.stderr.write(`[qorpera] WARN ${msg}\n`);

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    warn("NEXT_PUBLIC_APP_URL is not set — OAuth redirects and email links may be wrong");
  }

  if (!process.env.CREDENTIAL_ENCRYPTION_KEY) {
    warn("CREDENTIAL_ENCRYPTION_KEY is not set — falling back to APP_SECRET for encryption");
  } else if (process.env.CREDENTIAL_ENCRYPTION_KEY.length !== 32) {
    warn(`CREDENTIAL_ENCRYPTION_KEY should be exactly 32 chars (got ${process.env.CREDENTIAL_ENCRYPTION_KEY.length})`);
  }

  const hasEmail =
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    process.env.POSTMARK_SERVER_TOKEN;
  if (!hasEmail) {
    warn("No email provider configured (RESEND_API_KEY / SENDGRID_API_KEY / POSTMARK_SERVER_TOKEN) — transactional emails will fail");
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    warn("STRIPE_SECRET_KEY is not set — payment flows will be unavailable");
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    warn("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting is disabled");
  }
}
