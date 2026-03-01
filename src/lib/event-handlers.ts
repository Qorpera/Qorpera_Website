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

  // DELEGATED_TASK_COMPLETED -> log completion + Slack notification + continuation
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

    // Evaluate whether a follow-up task should be created (chain continuation)
    if (event.status === "DONE") {
      try {
        const row = await prisma.delegatedTask.findUnique({
          where: { id: event.taskId },
          select: { completionDigest: true, chainDepth: true, title: true, toAgentTarget: true, goalStepId: true },
        });
        if (row && (row.chainDepth ?? 0) < 3) {
          const { evaluateTaskContinuation } = await import("@/lib/event-orchestrator");
          void evaluateTaskContinuation(event.userId, {
            id: event.taskId,
            title: row.title,
            toAgentTarget: row.toAgentTarget,
            completionDigest: row.completionDigest,
            chainDepth: row.chainDepth ?? 0,
          }).catch(() => {});
        }

        // If this task is linked to a goal step, update goal progress
        if (row?.goalStepId) {
          const { onGoalStepTaskCompleted } = await import("@/lib/goal-store");
          void onGoalStepTaskCompleted(event.userId, event.taskId, event.status).catch(() => {});
        }
      } catch {
        // Non-critical continuation evaluation
      }
    }

    // Extract entities from completed task text (fire-and-forget)
    try {
      const taskRow = await prisma.delegatedTask.findUnique({
        where: { id: event.taskId },
        select: { title: true, instructions: true, completionDigest: true },
      });
      if (taskRow) {
        const combined = [taskRow.title, taskRow.instructions, taskRow.completionDigest ?? ""].join(" ");
        const { extractEntitiesFromText } = await import("@/lib/entity-extractor");
        void extractEntitiesFromText(event.userId, combined, "DELEGATED_TASK", event.taskId).catch(() => {});
      }
    } catch {
      // Non-critical entity extraction
    }

    // Also handle FAILED tasks linked to goal steps
    if (event.status === "FAILED") {
      try {
        const row = await prisma.delegatedTask.findUnique({
          where: { id: event.taskId },
          select: { goalStepId: true },
        });
        if (row?.goalStepId) {
          const { onGoalStepTaskCompleted } = await import("@/lib/goal-store");
          void onGoalStepTaskCompleted(event.userId, event.taskId, event.status).catch(() => {});
        }
      } catch {
        // Non-critical goal step update
      }
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
