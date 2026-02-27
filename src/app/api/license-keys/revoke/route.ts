import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { RevokeLicenseKeyBody } from "@/lib/schemas";
import { revokeLicenseKey } from "@/lib/license-keys-store";

export const runtime = "nodejs";

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
  const parsed = RevokeLicenseKeyBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    await revokeLicenseKey(userId, parsed.data.keyId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to revoke" }, { status: 400 });
  }
}
