/**
 * Runner Bridge - connects delegated tasks to the runner daemon.
 * Bridges the gap between task orchestration and local execution.
 */

import { prisma } from "@/lib/db";
import { enqueueRunnerJob, getRunnerJobForUser } from "@/lib/runner-control-plane";

export async function bridgeDelegatedTaskToRunner(input: {
  userId: string;
  delegatedTaskId: string;
  title: string;
  jobType: string;
  payload: Record<string, unknown>;
}) {
  const job = await enqueueRunnerJob(input.userId, {
    title: input.title,
    jobType: input.jobType,
    payload: {
      ...input.payload,
      delegatedTaskId: input.delegatedTaskId,
    },
    requestedBy: `delegated_task:${input.delegatedTaskId}`,
  });

  return job;
}

export async function pollRunnerJobResult(
  userId: string,
  jobId: string,
  options?: { timeoutMs?: number; pollIntervalMs?: number },
): Promise<{
  ok: boolean;
  status: string;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
}> {
  const timeoutMs = options?.timeoutMs ?? 30000;
  const pollIntervalMs = options?.pollIntervalMs ?? 2000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await getRunnerJobForUser(userId, jobId);

    if (job.status === "SUCCEEDED") {
      return {
        ok: true,
        status: job.status,
        result: job.result ?? null,
        errorMessage: null,
      };
    }

    if (job.status === "FAILED" || job.status === "CANCELED") {
      return {
        ok: false,
        status: job.status,
        result: job.result ?? null,
        errorMessage: job.errorMessage ?? null,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return {
    ok: false,
    status: "TIMEOUT",
    result: null,
    errorMessage: `Job did not complete within ${timeoutMs}ms`,
  };
}

export async function captureRunnerResultAsDelegationTrace(input: {
  delegatedTaskId: string;
  jobId: string;
  jobType: string;
  ok: boolean;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  latencyMs: number;
}) {
  await prisma.delegatedTaskToolCall.create({
    data: {
      delegatedTaskId: input.delegatedTaskId,
      toolName: `runner.${input.jobType}`.slice(0, 120),
      phase: "runner_execution",
      status: input.ok ? "ok" : "error",
      latencyMs: input.latencyMs,
      inputSummary: `Runner job ${input.jobId} (${input.jobType})`.slice(0, 240),
      outputSummary: input.ok
        ? `Completed: ${JSON.stringify(input.result ?? {}).slice(0, 200)}`
        : `Failed: ${(input.errorMessage ?? "Unknown error").slice(0, 200)}`,
    },
  });
}
