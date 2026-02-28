import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { decodeSession } from "@/lib/session-codec";
import { runSchedulerTick, runDelegatedTaskQueue } from "@/lib/orchestration-store";
import { checkAndExpireApprovals } from "@/lib/inbox-expiry";
import { verifySameOrigin } from "@/lib/request-security";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let userId: string | null = null;

  // Bearer token auth — used by the headless scheduler process (runner/scheduler.mjs).
  // The token value is a session token generated via encodeSession().
  // Trusted process: skip same-origin check.
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const session = await decodeSession(token);
      if (session) userId = session.userId;
    }
  }

  // Cookie auth — browser requests (require same-origin).
  if (!userId) {
    const sameOrigin = verifySameOrigin(request);
    if (!sameOrigin.ok) return sameOrigin.response;
    try {
      userId = await requireUserId();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const rl = await checkRateLimit(`scheduler:${userId}`, "scheduler");
  if (!rl.allowed) return rl.response!;

  const tickResult = await runSchedulerTick(userId);

  // Expire stale approval items (escalate or auto-close based on user prefs).
  let expiredApprovals = 0;
  try {
    expiredApprovals = await checkAndExpireApprovals(userId);
  } catch {
    // Non-fatal
  }

  // Drain the task queue — execute QUEUED tasks (newly created or previously queued).
  let executedCount = 0;
  try {
    const queueResult = await runDelegatedTaskQueue(userId);
    executedCount = queueResult.processed.length;
  } catch {
    // Non-fatal: tasks remain QUEUED for the next tick.
  }

  return NextResponse.json({
    ok: true,
    ...tickResult,
    executed: executedCount,
    expiredApprovals,
  });
}
