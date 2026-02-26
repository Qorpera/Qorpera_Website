import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockEnqueueRunnerJob, mockGetRunnerJobForUser, mockPrisma } = vi.hoisted(() => ({
  mockEnqueueRunnerJob: vi.fn(),
  mockGetRunnerJobForUser: vi.fn(),
  mockPrisma: {
    delegatedTaskToolCall: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/runner-control-plane", () => ({
  enqueueRunnerJob: mockEnqueueRunnerJob,
  getRunnerJobForUser: mockGetRunnerJobForUser,
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { bridgeDelegatedTaskToRunner, pollRunnerJobResult, captureRunnerResultAsDelegationTrace } from "@/lib/runner-bridge";

describe("bridgeDelegatedTaskToRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues a runner job with delegatedTaskId in payload", async () => {
    mockEnqueueRunnerJob.mockResolvedValue({ id: "job-1", status: "QUEUED" });

    const result = await bridgeDelegatedTaskToRunner({
      userId: "user-1",
      delegatedTaskId: "task-1",
      title: "Run script",
      jobType: "command.exec",
      payload: { command: "ls -la" },
    });

    expect(mockEnqueueRunnerJob).toHaveBeenCalledWith("user-1", {
      title: "Run script",
      jobType: "command.exec",
      payload: { command: "ls -la", delegatedTaskId: "task-1" },
      requestedBy: "delegated_task:task-1",
    });
    expect(result).toEqual({ id: "job-1", status: "QUEUED" });
  });
});

describe("pollRunnerJobResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns immediately on SUCCEEDED job", async () => {
    mockGetRunnerJobForUser.mockResolvedValue({
      status: "SUCCEEDED",
      result: { output: "done" },
      errorMessage: null,
    });

    const result = await pollRunnerJobResult("user-1", "job-1", {
      timeoutMs: 5000,
      pollIntervalMs: 100,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("SUCCEEDED");
    expect(result.result).toEqual({ output: "done" });
  });

  it("returns immediately on FAILED job", async () => {
    mockGetRunnerJobForUser.mockResolvedValue({
      status: "FAILED",
      result: null,
      errorMessage: "Script failed",
    });

    const result = await pollRunnerJobResult("user-1", "job-1", {
      timeoutMs: 5000,
      pollIntervalMs: 100,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("Script failed");
  });

  it("times out when job stays RUNNING", async () => {
    mockGetRunnerJobForUser.mockResolvedValue({
      status: "RUNNING",
      result: null,
      errorMessage: null,
    });

    const result = await pollRunnerJobResult("user-1", "job-1", {
      timeoutMs: 300,
      pollIntervalMs: 100,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("TIMEOUT");
  });
});

describe("captureRunnerResultAsDelegationTrace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a tool call trace record", async () => {
    mockPrisma.delegatedTaskToolCall.create.mockResolvedValue({ id: "trace-1" });

    await captureRunnerResultAsDelegationTrace({
      delegatedTaskId: "task-1",
      jobId: "job-1",
      jobType: "command.exec",
      ok: true,
      result: { output: "hello" },
      errorMessage: null,
      latencyMs: 500,
    });

    expect(mockPrisma.delegatedTaskToolCall.create).toHaveBeenCalledOnce();
    const callArgs = mockPrisma.delegatedTaskToolCall.create.mock.calls[0][0];
    expect(callArgs.data.delegatedTaskId).toBe("task-1");
    expect(callArgs.data.toolName).toBe("runner.command.exec");
    expect(callArgs.data.status).toBe("ok");
    expect(callArgs.data.latencyMs).toBe(500);
  });

  it("records error status for failed jobs", async () => {
    mockPrisma.delegatedTaskToolCall.create.mockResolvedValue({ id: "trace-2" });

    await captureRunnerResultAsDelegationTrace({
      delegatedTaskId: "task-2",
      jobId: "job-2",
      jobType: "file.write",
      ok: false,
      result: null,
      errorMessage: "Permission denied",
      latencyMs: 100,
    });

    const callArgs = mockPrisma.delegatedTaskToolCall.create.mock.calls[0][0];
    expect(callArgs.data.status).toBe("error");
    expect(callArgs.data.outputSummary).toContain("Permission denied");
  });
});
