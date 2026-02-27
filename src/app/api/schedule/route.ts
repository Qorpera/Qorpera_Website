import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { listRecurringTasks, createRecurringTask } from "@/lib/recurring-tasks-store";
import { CreateRecurringTaskBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tasks = await listRecurringTasks(userId);
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
  const raw = await request.json().catch(() => ({}));
  const parsed = CreateRecurringTaskBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  try {
    const task = await createRecurringTask(userId, parsed.data);
    return NextResponse.json({ ok: true, task }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
