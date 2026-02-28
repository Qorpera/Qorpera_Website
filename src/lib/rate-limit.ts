import { NextResponse } from "next/server";

type Preset = "auth" | "signup" | "chat" | "webhook";

// [maxRequests, windowSeconds]
const PRESETS: Record<Preset, [number, number]> = {
  auth:    [5,   15 * 60],
  signup:  [3,   60 * 60],
  chat:    [30,  60],
  webhook: [120, 60],      // 120 events/min per provider+IP
};

/**
 * Check a sliding-window rate limit via Upstash Redis.
 * Falls back to { allowed: true } when UPSTASH env vars are absent (local dev).
 */
export async function checkRateLimit(
  identifier: string,
  preset: Preset,
): Promise<{ allowed: boolean; response?: NextResponse }> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { allowed: true };
  }

  // Lazy imports so the modules are only loaded when the env vars exist,
  // keeping cold-start overhead minimal in environments without Redis.
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const [limit, windowSeconds] = PRESETS[preset];

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: `rl:${preset}`,
  });

  const { success, reset } = await ratelimit.limit(identifier);
  if (success) return { allowed: true };

  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return {
    allowed: false,
    response: NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(retryAfter, 1)) },
      },
    ),
  };
}
