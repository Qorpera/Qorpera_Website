import { NextResponse } from "next/server";
import { applyInboxAction } from "@/lib/inbox-store";
import { requireUserId } from "@/lib/auth";
import { InboxActionBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const raw = await request.json().catch(() => ({}));
  const parsed = InboxActionBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const item = await applyInboxAction(userId, id, parsed.data.action);
  if (!item) return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });

  return NextResponse.json({ ok: true, item });
}
