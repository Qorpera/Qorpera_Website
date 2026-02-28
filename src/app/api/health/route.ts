import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function checkStripe(): Promise<"ok" | "unconfigured" | "error"> {
  if (!process.env.STRIPE_SECRET_KEY) return "unconfigured";
  try {
    const res = await fetch("https://api.stripe.com/v1/customers?limit=1", {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      signal: AbortSignal.timeout(4000),
    });
    return res.ok || res.status === 401 ? "ok" : "error";
  } catch {
    return "error";
  }
}

async function checkRedis(): Promise<"ok" | "unconfigured" | "error"> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return "unconfigured";
  }
  try {
    const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

function checkEmail(): "ok" | "unconfigured" {
  const configured =
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    process.env.POSTMARK_SERVER_TOKEN;
  return configured ? "ok" : "unconfigured";
}

export async function GET() {
  const [stripe, redis] = await Promise.all([checkStripe(), checkRedis()]);

  let db: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }

  const checks = { db, stripe, redis, email: checkEmail() };
  const degraded = Object.values(checks).some((v) => v === "error");
  const status = db === "error" ? 503 : degraded ? 207 : 200;

  return Response.json({ status: degraded ? "degraded" : "ok", checks }, { status });
}
