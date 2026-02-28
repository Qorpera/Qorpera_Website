/**
 * Next.js instrumentation hook — runs once at server startup before any requests.
 * Validates that required environment variables are present in production.
 */
export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const required: string[] = [
    "DATABASE_URL",
    "APP_SECRET",
    "CREDENTIAL_ENCRYPTION_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];

  // At least one email provider must be configured
  const hasEmail =
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    process.env.POSTMARK_SERVER_TOKEN;

  const missing = required.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    throw new Error(
      `[qorpera] Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  if (!hasEmail) {
    throw new Error(
      "[qorpera] At least one email provider must be configured: RESEND_API_KEY, SENDGRID_API_KEY, or POSTMARK_SERVER_TOKEN",
    );
  }

  const encKey = process.env.CREDENTIAL_ENCRYPTION_KEY!;
  if (encKey.length !== 32) {
    throw new Error(
      `[qorpera] CREDENTIAL_ENCRYPTION_KEY must be exactly 32 characters (got ${encKey.length})`,
    );
  }

  const appSecret = process.env.APP_SECRET!;
  if (appSecret.length < 32) {
    throw new Error(
      `[qorpera] APP_SECRET must be at least 32 characters (got ${appSecret.length})`,
    );
  }
}
