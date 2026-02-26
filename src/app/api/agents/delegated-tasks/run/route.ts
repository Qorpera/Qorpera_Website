import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { executeDelegatedTask, runDelegatedTaskQueue } from "@/lib/orchestration-store";
import { RunDelegatedTaskBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

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
  const parsed = RunDelegatedTaskBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    if (parsed.data.taskId) {
      const task = await executeDelegatedTask(userId, parsed.data.taskId);
      return NextResponse.json({ ok: true, task });
    }
    const result = await runDelegatedTaskQueue(userId, parsed.data.limit ?? 3);
    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to run delegated tasks" }, { status: 400 });
  }
}
