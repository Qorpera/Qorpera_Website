import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { z } from "zod";
import { setFeatureFlag, deleteFeatureFlagOverride } from "@/lib/feature-flags-store";

function isOwner(userId: string) {
  const ownerId = process.env.OWNER_USER_ID;
  return Boolean(ownerId && userId === ownerId);
}

const ToggleBody = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  userId: z.string().optional(),
});

const DeleteOverrideBody = z.object({
  id: z.string().min(1),
});

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;
  const session = await getSession();
  if (!session || !isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ToggleBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await setFeatureFlag(parsed.data.key, parsed.data.enabled, parsed.data.userId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;
  const session = await getSession();
  if (!session || !isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = DeleteOverrideBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await deleteFeatureFlagOverride(parsed.data.id);
  return NextResponse.json({ ok: true });
}
