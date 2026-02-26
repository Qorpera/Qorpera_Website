import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies
const { mockPrisma, mockRunIntegrationAdaptersForTask, mockCallAgentLlm, mockGetCompanySoul, mockEventBus } = vi.hoisted(() => ({
  mockPrisma: {
    agentAutomationConfig: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
    delegatedTask: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
    delegatedTaskToolCall: { createMany: vi.fn(), create: vi.fn() },
    hiredJob: { findFirst: vi.fn(), findMany: vi.fn() },
    auditLog: { create: vi.fn() },
    submission: { create: vi.fn() },
    businessLogEntry: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  mockRunIntegrationAdaptersForTask: vi.fn(),
  mockCallAgentLlm: vi.fn(),
  mockGetCompanySoul: vi.fn(),
  mockEventBus: { emit: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/integration-adapters", () => ({
  runIntegrationAdaptersForTask: mockRunIntegrationAdaptersForTask,
}));
vi.mock("@/lib/agent-llm", () => ({ callAgentLlm: mockCallAgentLlm }));
vi.mock("@/lib/company-soul-store", () => ({ getCompanySoul: mockGetCompanySoul }));
vi.mock("@/lib/event-bus", () => ({ eventBus: mockEventBus }));

import {
  createDelegatedTask,
  updateDelegatedTaskStatus,
  type AgentTarget,
} from "@/lib/orchestration-store";

describe("createDelegatedTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.hiredJob.findFirst.mockResolvedValue({ id: "hired-1" });
    mockPrisma.agentAutomationConfig.findUnique.mockResolvedValue(null);
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  it("creates a task and emits DELEGATED_TASK_CREATED event", async () => {
    const mockRow = {
      id: "task-1",
      userId: "user-1",
      fromAgent: "CHIEF_ADVISOR",
      toAgentTarget: "ASSISTANT",
      title: "Test task",
      instructions: "Do something useful",
      status: "QUEUED",
      triggerSource: "DELEGATED",
      scheduledFor: null,
      dueLabel: null,
      projectRef: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };
    mockPrisma.delegatedTask.create.mockResolvedValue(mockRow);

    const result = await createDelegatedTask("user-1", {
      toAgentTarget: "ASSISTANT",
      title: "Test task",
      instructions: "Do something useful",
    });

    expect(result.id).toBe("task-1");
    expect(result.toAgentTarget).toBe("ASSISTANT");
    expect(result.status).toBe("QUEUED");

    expect(mockEventBus.emit).toHaveBeenCalledWith({
      type: "DELEGATED_TASK_CREATED",
      userId: "user-1",
      taskId: "task-1",
      fromAgent: "CHIEF_ADVISOR",
      toAgentTarget: "ASSISTANT",
      title: "Test task",
    });
  });

  it("rejects empty title", async () => {
    await expect(
      createDelegatedTask("user-1", {
        toAgentTarget: "ASSISTANT",
        title: "",
        instructions: "Do something",
      }),
    ).rejects.toThrow("Title and instructions are required");
  });

  it("rejects empty instructions", async () => {
    await expect(
      createDelegatedTask("user-1", {
        toAgentTarget: "ASSISTANT",
        title: "Test",
        instructions: "",
      }),
    ).rejects.toThrow("Title and instructions are required");
  });

  it("rejects if agent not hired", async () => {
    mockPrisma.hiredJob.findFirst.mockResolvedValue(null);

    await expect(
      createDelegatedTask("user-1", {
        toAgentTarget: "ASSISTANT",
        title: "Test",
        instructions: "Do something",
      }),
    ).rejects.toThrow("not hired");
  });
});

describe("updateDelegatedTaskStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates task status", async () => {
    const mockRow = {
      id: "task-1",
      userId: "user-1",
      fromAgent: "CHIEF_ADVISOR",
      toAgentTarget: "ASSISTANT",
      title: "Test",
      instructions: "Test instructions",
      status: "QUEUED",
      triggerSource: "DELEGATED",
      scheduledFor: null,
      dueLabel: null,
      projectRef: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };
    mockPrisma.delegatedTask.findFirst.mockResolvedValue(mockRow);
    mockPrisma.delegatedTask.update.mockResolvedValue({ ...mockRow, status: "DONE", completedAt: new Date() });
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const result = await updateDelegatedTaskStatus("user-1", "task-1", "DONE");
    expect(result.status).toBe("DONE");
  });

  it("rejects invalid status", async () => {
    await expect(
      updateDelegatedTaskStatus("user-1", "task-1", "INVALID" as "DONE"),
    ).rejects.toThrow("Invalid status");
  });

  it("rejects if task not found", async () => {
    mockPrisma.delegatedTask.findFirst.mockResolvedValue(null);

    await expect(
      updateDelegatedTaskStatus("user-1", "task-1", "DONE"),
    ).rejects.toThrow("Task not found");
  });
});
