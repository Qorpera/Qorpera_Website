import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { testConnectorConnection, type SupportedProvider } from "@/lib/connectors-store";
import { verifySameOrigin } from "@/lib/request-security";

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

  const body = (await request.json().catch(() => ({}))) as { provider?: SupportedProvider };
  const provider: SupportedProvider =
    body.provider && ["OPENAI", "ANTHROPIC", "GOOGLE"].includes(body.provider) ? body.provider : "OPENAI";

  const result = await testConnectorConnection(userId, provider);
  return NextResponse.json({ ok: result.ok, message: result.message, connector: "connector" in result ? result.connector : null }, { status: result.ok ? 200 : 400 });
}
