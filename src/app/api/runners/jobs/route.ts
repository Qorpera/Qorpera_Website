import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { approveRunnerJob, cancelRunnerJob, enqueueRunnerJob, listRunnerJobsForUser } from "@/lib/runner-control-plane";
import { EnqueueRunnerJobBody, RunnerJobActionBody } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  try {
    const jobs = await listRunnerJobsForUser(userId, Math.max(1, Math.min(200, limit || 50)));
    return NextResponse.json({ jobs });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to list runner jobs" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await request.json().catch(() => ({}));
  const parsed = EnqueueRunnerJobBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  try {
    const job = await enqueueRunnerJob(userId, parsed.data);
    return NextResponse.json({ ok: true, job });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to enqueue runner job" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await request.json().catch(() => ({}));
  const parsed = RunnerJobActionBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid patch action" }, { status: 400 });
  }
  try {
    const job = parsed.data.action === "approve"
      ? await approveRunnerJob(userId, parsed.data.id)
      : await cancelRunnerJob(userId, parsed.data.id);
    return NextResponse.json({ ok: true, job });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update runner job" }, { status: 400 });
  }
}
