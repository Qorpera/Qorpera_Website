import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createDelegatedTask, listDelegatedTasks, updateDelegatedTaskStatus } from "@/lib/orchestration-store";
import { CreateDelegatedTaskBody, UpdateDelegatedTaskStatusBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tasks = await listDelegatedTasks(userId, 120);
  return NextResponse.json({ tasks });
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
  const rl = await checkRateLimit(`task_create:${userId}`, "task_create");
  if (!rl.allowed) return rl.response!;

  const raw = await request.json().catch(() => ({}));
  const parsed = CreateDelegatedTaskBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  try {
    const task = await createDelegatedTask(userId, parsed.data);
    return NextResponse.json({ ok: true, task });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create delegated task" }, { status: 400 });
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
  const parsed = UpdateDelegatedTaskStatusBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Task id and status required" }, { status: 400 });
  }
  try {
    const task = await updateDelegatedTaskStatus(userId, parsed.data.id, parsed.data.status);
    return NextResponse.json({ ok: true, task });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update status" }, { status: 400 });
  }
}
