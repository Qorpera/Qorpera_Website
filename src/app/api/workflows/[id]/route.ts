import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorkflow, updateWorkflow, deleteWorkflow } from "@/lib/workflow-store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workflow = await getWorkflow(session.userId, id);
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ workflow });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { name?: string; description?: string; graphJson?: string; status?: string };

  const updated = await updateWorkflow(session.userId, id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ workflow: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteWorkflow(session.userId, id);
  return NextResponse.json({ ok: true });
}
