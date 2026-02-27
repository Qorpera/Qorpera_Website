/**
 * Authenticated webhook management endpoint.
 * GET  /api/webhooks/manage — list all webhook endpoints for user
 * POST /api/webhooks/manage — create or regenerate a webhook endpoint
 * DELETE /api/webhooks/manage — delete a webhook endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { CreateWebhookBody, DeleteWebhookBody } from "@/lib/schemas";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  deleteWebhookEndpoint,
} from "@/lib/webhook-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const endpoints = await listWebhookEndpoints(session.userId);
  return NextResponse.json({ endpoints });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateWebhookBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { agentTarget, label } = parsed.data;
  const result = await createWebhookEndpoint(session.userId, agentTarget, label);

  return NextResponse.json({
    endpoint: result.endpoint,
    secret: result.secret,
    webhookUrl: `/api/webhooks/ingest/${session.userId}/${agentTarget}`,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = DeleteWebhookBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const deleted = await deleteWebhookEndpoint(session.userId, parsed.data.agentTarget);
  return NextResponse.json({ ok: deleted });
}
