import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { SubmitFeedbackBody } from "@/lib/schemas";
import { createFeedback, listAllFeedback } from "@/lib/agent-feedback-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Suppress unused variable warning — userId confirms auth
  void userId;

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limitParam = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), 200);

  const { items, nextCursor } = await listAllFeedback({ cursor, limit });
  return NextResponse.json({ items, nextCursor });
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
  const parsed = SubmitFeedbackBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const row = await createFeedback(userId, parsed.data.agentKind, parsed.data.message, parsed.data.sourceRef);
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to submit" }, { status: 500 });
  }
}
