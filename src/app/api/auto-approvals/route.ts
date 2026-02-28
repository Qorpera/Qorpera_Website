import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { listAutoApprovalRules, createAutoApprovalRule } from "@/lib/auto-approval-store";
import { CreateAutoApprovalBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rules = await listAutoApprovalRules(userId);
  return NextResponse.json({ rules });
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
  const parsed = CreateAutoApprovalBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  try {
    const rule = await createAutoApprovalRule(userId, parsed.data);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (e) {
    console.error("[auto-approvals] create failed:", e);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}
