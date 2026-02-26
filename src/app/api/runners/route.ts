import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { createRunnerRegistration, listRunnersForUser } from "@/lib/runner-control-plane";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const runners = await listRunnersForUser(userId);
    return NextResponse.json({ runners });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to list runners" }, { status: 503 });
  }
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
  const body = (await request.json().catch(() => ({}))) as { name?: string; environment?: string; label?: string };
  try {
    const registration = await createRunnerRegistration(userId, {
      name: body.name ?? "Local Runner",
      environment: body.environment ?? "desktop",
      label: body.label,
    });
    return NextResponse.json({ ok: true, registration });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to register runner" }, { status: 503 });
  }
}
