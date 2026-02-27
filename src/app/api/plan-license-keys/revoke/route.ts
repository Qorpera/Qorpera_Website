import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { RevokePlanLicenseKeyBody } from "@/lib/schemas";
import { revokePlanLicenseKey } from "@/lib/plan-license-keys-store";

export const runtime = "nodejs";

function isOwner(userId: string) {
  const ownerId = process.env.OWNER_USER_ID;
  return Boolean(ownerId && userId === ownerId);
}

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;

  const session = await getSession();
  if (!session || !isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = RevokePlanLicenseKeyBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    await revokePlanLicenseKey(session.userId, parsed.data.keyId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to revoke" }, { status: 400 });
  }
}
