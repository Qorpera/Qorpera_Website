import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorkflowRun } from "@/lib/workflow-store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { runId } = await params;
  const run = await getWorkflowRun(runId);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ run });
}
