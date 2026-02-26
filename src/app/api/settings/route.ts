import { NextResponse } from "next/server";
import { getAppPreferences, setAppPreferences } from "@/lib/settings-store";
import { requireUserId } from "@/lib/auth";
import { SettingsBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const preferences = await getAppPreferences(userId);
  return NextResponse.json({ preferences });
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
  const parsed = SettingsBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const preferences = await setAppPreferences(userId, parsed.data);
  return NextResponse.json({ ok: true, preferences });
}
