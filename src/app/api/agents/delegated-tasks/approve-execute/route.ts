import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { approveAndExecuteDelegatedTaskConnectors } from "@/lib/orchestration-store";
import { ApproveExecuteBody } from "@/lib/schemas";
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
  const parsed = ApproveExecuteBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

  try {
    const result = await approveAndExecuteDelegatedTaskConnectors(userId, parsed.data.taskId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to approve and execute connector actions" },
      { status: 400 },
    );
  }
}
