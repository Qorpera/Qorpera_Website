import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listAutoApprovalRules, createAutoApprovalRule, updateAutoApprovalRule, deleteAutoApprovalRule } from "@/lib/auto-approval-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rules = await listAutoApprovalRules(session.userId);
    return NextResponse.json({ rules });
  } catch {
    return NextResponse.json({ rules: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { name?: string; toolName?: string; conditionJson?: string | null };
  const toolName = body.toolName?.trim();
  if (!toolName) return NextResponse.json({ error: "toolName is required" }, { status: 400 });

  const rule = await createAutoApprovalRule(session.userId, {
    name: body.name ?? toolName,
    toolName,
    conditionJson: body.conditionJson ?? null,
  });
  return NextResponse.json({ rule }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { id: string; name?: string; toolName?: string; conditionJson?: string | null; enabled?: boolean };
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const rule = await updateAutoApprovalRule(session.userId, body.id, {
      name: body.name,
      toolName: body.toolName,
      conditionJson: body.conditionJson,
      enabled: body.enabled,
    });
    return NextResponse.json({ rule });
  } catch {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    await deleteAutoApprovalRule(session.userId, id);
  } catch {
    // ignore not found
  }
  return NextResponse.json({ ok: true });
}
