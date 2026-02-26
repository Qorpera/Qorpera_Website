import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { listExternalConnectors, upsertExternalConnector, deleteExternalConnector, type ConnectorKind } from "@/lib/external-connector-store";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

const VALID_CONNECTORS: ConnectorKind[] = ["resend", "sendgrid", "postmark", "webhook", "slack"];

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const connectors = await listExternalConnectors(userId);
  return NextResponse.json({ connectors });
}

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await request.json().catch(() => ({})) as {
    connector?: string;
    apiKey?: string;
    fromAddress?: string;
    label?: string;
    enabled?: boolean;
    action?: string;
  };

  const connector = body.connector as ConnectorKind;
  if (!VALID_CONNECTORS.includes(connector)) {
    return NextResponse.json({ error: "Invalid connector" }, { status: 400 });
  }

  if (body.action === "delete") {
    await deleteExternalConnector(userId, connector);
    return NextResponse.json({ ok: true });
  }

  const updated = await upsertExternalConnector(userId, connector, {
    apiKey: body.apiKey,
    fromAddress: body.fromAddress,
    label: body.label,
    enabled: body.enabled,
  });

  return NextResponse.json({ ok: true, connector: updated });
}
