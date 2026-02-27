/**
 * Public webhook ingest endpoint.
 * POST /api/webhooks/ingest/:userId/:agentTarget
 *
 * Auth via `Authorization: Bearer whsec_...` or `X-Webhook-Secret` header.
 * Creates a DelegatedTask with triggerSource "WEBHOOK:eventType".
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookRequest, recordWebhookCall } from "@/lib/webhook-store";
import { createDelegatedTask, type AgentTarget } from "@/lib/orchestration-store";
import { eventBus } from "@/lib/event-bus";

const VALID_AGENTS = new Set([
  "CHIEF_ADVISOR", "ASSISTANT", "SALES_REP", "CUSTOMER_SUCCESS",
  "MARKETING_COORDINATOR", "FINANCE_ANALYST", "OPERATIONS_MANAGER",
  "EXECUTIVE_ASSISTANT", "RESEARCH_ANALYST", "SEO_SPECIALIST",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; agentTarget: string }> },
) {
  const { userId, agentTarget } = await params;

  if (!userId || !agentTarget || !VALID_AGENTS.has(agentTarget)) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  // Extract secret from Authorization header or X-Webhook-Secret
  const authHeader = req.headers.get("authorization") ?? "";
  const xSecret = req.headers.get("x-webhook-secret") ?? "";
  const secret = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : xSecret.trim();

  if (!secret) {
    return NextResponse.json({ error: "Missing authentication" }, { status: 401 });
  }

  const verified = await verifyWebhookRequest(userId, agentTarget, secret);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
  }

  // Parse request body
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // Empty body is acceptable
  }

  const eventType = typeof body.event_type === "string" ? body.event_type.slice(0, 60) : "generic";
  const title = typeof body.title === "string" ? body.title.slice(0, 240) : `Webhook: ${eventType}`;
  const instructions = typeof body.instructions === "string"
    ? body.instructions.slice(0, 12000)
    : typeof body.payload === "string"
    ? body.payload.slice(0, 12000)
    : `Webhook event received (type: ${eventType}). Review and take appropriate action.\n\nPayload:\n${JSON.stringify(body, null, 2).slice(0, 4000)}`;

  try {
    const task = await createDelegatedTask(userId, {
      fromAgent: "WEBHOOK",
      toAgentTarget: agentTarget as AgentTarget,
      title,
      instructions,
      triggerSource: `WEBHOOK:${eventType}`,
      dueLabel: "Now",
    });

    await recordWebhookCall(userId, agentTarget);

    eventBus.emit({
      type: "WEBHOOK_EVENT_RECEIVED",
      userId,
      agentTarget,
      taskId: task.id,
      eventType,
    });

    return NextResponse.json({ ok: true, taskId: task.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
