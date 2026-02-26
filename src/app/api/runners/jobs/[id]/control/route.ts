import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { enqueueRunnerJobControl } from "@/lib/runner-control-plane";

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
  const body = (await request.json().catch(() => ({}))) as {
    kind?: string;
    payload?: Record<string, unknown>;
  };

  try {
    const result = await enqueueRunnerJobControl({
      userId,
      jobId: id,
      kind: body.kind ?? "stdin.line",
      payload: body.payload ?? {},
    });
    return NextResponse.json({ ...result, ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to enqueue runner control" }, { status: 400 });
  }
}
