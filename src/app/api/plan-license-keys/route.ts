import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { CreatePlanLicenseKeyBody } from "@/lib/schemas";
import { createPlanLicenseKey, listPlanLicenseKeys } from "@/lib/plan-license-keys-store";

export const runtime = "nodejs";

function isOwner(userId: string) {
  const ownerId = process.env.OWNER_USER_ID;
  return Boolean(ownerId && userId === ownerId);
}

export async function GET() {
  const session = await getSession();
  if (!session || !isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keys = await listPlanLicenseKeys(session.userId);
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;

  const session = await getSession();
  if (!session || !isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = CreatePlanLicenseKeyBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const key = await createPlanLicenseKey(session.userId, parsed.data.tier);
    return NextResponse.json({ key });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create key" }, { status: 500 });
  }
}
