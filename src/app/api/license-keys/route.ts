import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { CreateLicenseKeyBody } from "@/lib/schemas";
import { createLicenseKey, listLicenseKeys } from "@/lib/license-keys-store";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await listLicenseKeys(userId);
  return NextResponse.json({ keys });
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
  const parsed = CreateLicenseKeyBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const key = await createLicenseKey(userId, parsed.data.agentKind, parsed.data.schedule);
    return NextResponse.json({ key });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create key" }, { status: 500 });
  }
}
