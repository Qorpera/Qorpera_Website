/**
 * Event dispatch — creates tasks from routed webhook events.
 * Called by webhook ingest endpoint for immediate event→task dispatch.
 */

import { prisma } from "@/lib/db";
import { routeEvent } from "@/lib/event-router";
import { eventBus } from "@/lib/event-bus";

/**
 * Dispatch an inbound webhook event immediately if a routing rule matches.
 * Creates a DelegatedTask and updates the WebhookEvent with routing info.
 * Returns the task ID if dispatched, null otherwise.
 */
export async function dispatchEventImmediately(
  webhookEventId: string,
  userId: string,
  event: { provider: string; eventType: string; payload: string },
): Promise<string | null> {
  const match = await routeEvent(userId, event);
  if (!match) return null;

  // Create delegated task
  const task = await prisma.delegatedTask.create({
    data: {
      userId,
      fromAgent: "SYSTEM",
      toAgentTarget: match.agentTarget,
      title: match.taskTitle,
      instructions: match.taskInstructions,
      triggerSource: `WEBHOOK_ROUTE:${event.provider}:${event.eventType}`,
      webhookEventId,
      status: "QUEUED",
    },
  });

  // Update webhook event with routing info
  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      routedToAgent: match.agentTarget,
      dispatchMode: "IMMEDIATE",
      taskId: task.id,
      status: "PROCESSED",
      processedAt: new Date(),
    },
  });

  eventBus.emit({
    type: "WEBHOOK_EVENT_DISPATCHED",
    userId,
    webhookEventId,
    taskId: task.id,
    agentTarget: match.agentTarget,
    provider: event.provider,
    eventType: event.eventType,
  });

  return task.id;
}
