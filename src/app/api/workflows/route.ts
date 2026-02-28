import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listWorkflows, createWorkflow } from "@/lib/workflow-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await listWorkflows(session.userId);
  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { name?: string; description?: string; graphJson?: string; templateSlug?: string };
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const workflow = await createWorkflow(session.userId, {
    name: body.name,
    description: body.description,
    graphJson: body.graphJson ?? JSON.stringify({ nodes: [], edges: [] }),
    templateSlug: body.templateSlug,
  });

  return NextResponse.json({ workflow }, { status: 201 });
}
