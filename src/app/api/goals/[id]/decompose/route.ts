import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { decomposeGoal } from "@/lib/goal-store";

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

  const { id } = await params;

  try {
    const steps = await decomposeGoal(userId, id);
    return NextResponse.json({ steps }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Decomposition failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
