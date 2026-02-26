import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { getRunnerPolicyForUser, updateRunnerPolicyForUser } from "@/lib/runner-control-plane";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const policy = await getRunnerPolicyForUser(userId);
    return NextResponse.json({ policy });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load runner policy" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    templateKey?: string;
    templateName?: string;
    version?: number;
    rules?: unknown;
  };

  try {
    const policy = await updateRunnerPolicyForUser(userId, body);
    return NextResponse.json({ ok: true, policy });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update runner policy" }, { status: 400 });
  }
}
