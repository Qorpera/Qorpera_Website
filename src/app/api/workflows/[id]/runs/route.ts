import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorkflow, listWorkflowRuns } from "@/lib/workflow-store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify workflow belongs to user
  const workflow = await getWorkflow(session.userId, id);
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const runs = await listWorkflowRuns(id);
  return NextResponse.json({ runs });
}
