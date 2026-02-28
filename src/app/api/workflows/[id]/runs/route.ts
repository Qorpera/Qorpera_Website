import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listWorkflowRuns } from "@/lib/workflow-store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const runs = await listWorkflowRuns(id);
  return NextResponse.json({ runs });
}
