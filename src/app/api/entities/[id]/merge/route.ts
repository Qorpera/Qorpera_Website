import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { mergeEntities } from "@/lib/entity-store";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: keepId } = await params;
  const body = await request.json().catch(() => ({}));
  const mergeId = typeof body.mergeId === "string" ? body.mergeId.trim() : "";

  if (!mergeId) {
    return NextResponse.json({ error: "mergeId is required" }, { status: 400 });
  }
  if (mergeId === keepId) {
    return NextResponse.json({ error: "Cannot merge entity into itself" }, { status: 400 });
  }

  try {
    await mergeEntities(userId, keepId, mergeId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[entities] merge failed:", e);
    return NextResponse.json({ error: "Merge failed" }, { status: 500 });
  }
}
