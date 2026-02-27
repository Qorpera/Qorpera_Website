import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { grantManualLicense, revokeManualLicense } from "@/lib/admin-store";

function isOwner(userId: string) {
  const ownerId = process.env.OWNER_USER_ID;
  return Boolean(ownerId && userId === ownerId);
}

const GrantBody = z.object({
  email: z.string().email(),
  tier: z.enum(["SOLO", "SMALL_BUSINESS", "MID_SIZE"]),
});

const RevokeBody = z.object({
  subscriptionId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = GrantBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const result = await grantManualLicense(parsed.data.email, parsed.data.tier);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ subscriptionId: result.subscriptionId });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RevokeBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await revokeManualLicense(parsed.data.subscriptionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
