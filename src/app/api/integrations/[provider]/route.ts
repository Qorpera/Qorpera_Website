import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteConnection } from "@/lib/integrations/token-store";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = await params;
  const validProviders = ["hubspot", "slack", "google", "linear"];
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await deleteConnection(session.userId, provider);
  return NextResponse.json({ ok: true });
}
