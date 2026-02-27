/**
 * Centralized event handlers for qorpera.
 * Wires up the event bus to domain actions.
 */

import { eventBus } from "@/lib/event-bus";
import { prisma } from "@/lib/db";
import { createDelegatedTask, getAgentAutomationConfig } from "@/lib/orchestration-store";
import { sendSlackNotification } from "@/lib/external-connector-store";

let registered = false;

export function registerEventHandlers(): void {
  if (registered) return;
  registered = true;

  // BUSINESS_FILE_UPLOADED -> wake Chief Advisor if configured
  eventBus.on("BUSINESS_FILE_UPLOADED", async (event) => {
    try {
      const chiefConfig = await getAgentAutomationConfig(event.userId, "CHIEF_ADVISOR");
      const shouldWakeChief =
        chiefConfig.wakeOnDelegation &&
        (chiefConfig.triggerMode === "DELEGATED" ||
          chiefConfig.triggerMode === "HYBRID" ||
          chiefConfig.runContinuously);

      if (shouldWakeChief) {
        await createDelegatedTask(event.userId, {
          fromAgent: "EVENT_ROUTER",
          toAgentTarget: "CHIEF_ADVISOR",
          title: `Review new business file: ${event.fileName}`,
          instructions: [
            "A new business file was uploaded.",
            "",
            `File: ${event.fileName}`,
            `Category: ${event.category}`,
            `Type: ${event.mimeType ?? "unknown"}`,
            `Size: ${event.sizeBytes} bytes`,
            "",
            "Review relevance to current projects, extract key insights, and delegate follow-up work to the right agent if needed.",
          ].join("\n"),
          triggerSource: "EVENT:BUSINESS_FILE_UPLOAD",
          dueLabel: "Now",
          projectRef: `BUSINESS_FILE:${event.fileId}`,
        });
      }
    } catch {
      // File upload event should not fail silently; the upload itself already succeeded.
    }
  });

  // DELEGATED_TASK_COMPLETED -> log completion + Slack notification
  eventBus.on("DELEGATED_TASK_COMPLETED", async (event) => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: event.userId,
          scope: "EVENT",
          entityId: event.taskId,
          action: "DELEGATED_TASK_COMPLETED",
          summary: `Delegated task "${event.title}" completed with status ${event.status}`,
        },
      });
    } catch {
      // Non-critical logging
    }

    try {
      const statusEmoji = event.status === "DONE" ? "✅" : event.status === "FAILED" ? "❌" : "⚠️";
      await sendSlackNotification(event.userId, {
        text: `${statusEmoji} Agent task *${event.status.toLowerCase()}*: ${event.title}`,
      });
    } catch {
      // Non-critical Slack notification
    }
  });

  // WEBHOOK_EVENT_RECEIVED -> audit log
  eventBus.on("WEBHOOK_EVENT_RECEIVED", async (event) => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: event.userId,
          scope: "WEBHOOK",
          entityId: event.taskId,
          action: "WEBHOOK_RECEIVED",
          summary: `Webhook event "${event.eventType}" received for ${event.agentTarget}, created task ${event.taskId}`,
          metadata: JSON.stringify({ agentTarget: event.agentTarget, eventType: event.eventType }),
        },
      });
    } catch {
      // Non-critical audit logging
    }
  });

  // RUNNER_JOB_COMPLETED -> capture result into delegation traces if linked
  eventBus.on("RUNNER_JOB_COMPLETED", async (event) => {
    try {
      const job = await prisma.runnerJob.findFirst({
        where: { id: event.jobId },
        select: { payloadJson: true },
      });
      if (!job) return;

      const payload = JSON.parse(job.payloadJson || "{}") as Record<string, unknown>;
      const delegatedTaskId = typeof payload.delegatedTaskId === "string" ? payload.delegatedTaskId : null;
      if (!delegatedTaskId) return;

      await prisma.delegatedTaskToolCall.create({
        data: {
          delegatedTaskId,
          toolName: `runner.${event.jobType}`.slice(0, 120),
          phase: "runner_completion_event",
          status: event.ok ? "ok" : "error",
          latencyMs: null,
          inputSummary: `Runner job ${event.jobId} completed via event`,
          outputSummary: event.ok ? "Succeeded" : `Failed: ${(event.errorMessage ?? "").slice(0, 200)}`,
        },
      });
    } catch {
      // Non-critical trace capture
    }

    try {
      const statusEmoji = event.ok ? "✅" : "❌";
      await sendSlackNotification(event.userId, {
        text: `${statusEmoji} Runner job *${event.ok ? "succeeded" : "failed"}* (${event.jobType}): ${event.jobId}`,
      });
    } catch {
      // Non-critical Slack notification
    }
  });
}
