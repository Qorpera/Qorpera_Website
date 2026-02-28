import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { executeWorkflow } from "@/lib/workflow-engine";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(`workflow_run:${session.userId}`, "workflow_run");
  if (!rl.allowed) return rl.response!;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { triggerPayload?: unknown };

  try {
    const runId = await executeWorkflow(id, session.userId, body.triggerPayload);
    return NextResponse.json({ runId }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to execute workflow" },
      { status: 400 },
    );
  }
}
