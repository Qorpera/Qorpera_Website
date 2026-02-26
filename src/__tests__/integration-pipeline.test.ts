import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration pipeline test
 * Validates the full flow: event emission -> LLM reasoning -> adapter execution -> trace capture
 */

const { mockEventBus } = vi.hoisted(() => ({
  mockEventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    onAny: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

vi.mock("@/lib/event-bus", () => ({ eventBus: mockEventBus }));

const { mockGetModelRouteForAgentKind, mockGetProviderApiKeyRuntime, mockCheckManagedGuardrails, mockRecordManagedUsage, mockPostOllamaJson } = vi.hoisted(() => ({
  mockGetModelRouteForAgentKind: vi.fn(),
  mockGetProviderApiKeyRuntime: vi.fn(),
  mockCheckManagedGuardrails: vi.fn(),
  mockRecordManagedUsage: vi.fn(),
  mockPostOllamaJson: vi.fn(),
}));

vi.mock("@/lib/model-routing-store", () => ({
  getModelRouteForAgentKind: mockGetModelRouteForAgentKind,
  getModelRoute: vi.fn().mockResolvedValue({ provider: "OPENAI", modelName: "gpt-4.1-mini" }),
}));

vi.mock("@/lib/connectors-store", () => ({
  getProviderApiKeyRuntime: mockGetProviderApiKeyRuntime,
  checkManagedGuardrails: mockCheckManagedGuardrails,
  recordManagedUsage: mockRecordManagedUsage,
}));

vi.mock("@/lib/ollama", () => ({
  postOllamaJson: mockPostOllamaJson,
}));

const { mockEnqueueRunnerJob, mockGetRunnerJobForUser, mockPrisma } = vi.hoisted(() => ({
  mockEnqueueRunnerJob: vi.fn(),
  mockGetRunnerJobForUser: vi.fn(),
  mockPrisma: {
    delegatedTaskToolCall: { create: vi.fn() },
  },
}));

vi.mock("@/lib/runner-control-plane", () => ({
  enqueueRunnerJob: mockEnqueueRunnerJob,
  getRunnerJobForUser: mockGetRunnerJobForUser,
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

// Mock global fetch for OpenAI calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { callAgentLlm, callAgentLlmWithTools } from "@/lib/agent-llm";
import { bridgeDelegatedTaskToRunner, pollRunnerJobResult, captureRunnerResultAsDelegationTrace } from "@/lib/runner-bridge";
import { eventBus } from "@/lib/event-bus";

describe("Full Pipeline Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("task creation -> LLM reasoning -> runner bridge -> completion -> event emission", async () => {
    // Step 1: Emit task created event
    eventBus.emit({
      type: "DELEGATED_TASK_CREATED",
      userId: "user-1",
      taskId: "task-1",
      fromAgent: "CHIEF_ADVISOR",
      toAgentTarget: "ASSISTANT",
      title: "Process customer data",
    });
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "DELEGATED_TASK_CREATED" }),
    );

    // Step 2: LLM reasoning produces analysis
    mockGetModelRouteForAgentKind.mockResolvedValue({
      provider: "OPENAI",
      modelName: "gpt-4.1-mini",
    });
    mockGetProviderApiKeyRuntime.mockResolvedValue({
      apiKey: "sk-test",
      mode: "BYOK",
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: "Analysis: Extract customer names and segment by region. Create CSV output.",
      }),
    });

    const llmResult = await callAgentLlm({
      userId: "user-1",
      agentKind: "ASSISTANT",
      systemPrompt: "You are the assistant agent.",
      userMessage: "Process customer data file and extract key contacts.",
    });
    expect(llmResult.text).toContain("Extract customer names");
    expect(llmResult.provider).toBe("OPENAI");

    // Step 3: Bridge to runner for local execution
    mockEnqueueRunnerJob.mockResolvedValue({
      id: "job-1",
      status: "QUEUED",
      jobType: "command.exec",
    });

    const job = await bridgeDelegatedTaskToRunner({
      userId: "user-1",
      delegatedTaskId: "task-1",
      title: "Execute data processing script",
      jobType: "command.exec",
      payload: { command: "python process_data.py" },
    });
    expect(job.id).toBe("job-1");

    // Step 4: Poll for runner result
    mockGetRunnerJobForUser.mockResolvedValue({
      status: "SUCCEEDED",
      result: { output: "Processed 150 records", file: "output.csv" },
      errorMessage: null,
    });

    const pollResult = await pollRunnerJobResult("user-1", "job-1", {
      timeoutMs: 5000,
      pollIntervalMs: 100,
    });
    expect(pollResult.ok).toBe(true);
    expect(pollResult.result).toEqual({ output: "Processed 150 records", file: "output.csv" });

    // Step 5: Capture trace
    mockPrisma.delegatedTaskToolCall.create.mockResolvedValue({ id: "trace-1" });

    await captureRunnerResultAsDelegationTrace({
      delegatedTaskId: "task-1",
      jobId: "job-1",
      jobType: "command.exec",
      ok: true,
      result: pollResult.result,
      errorMessage: null,
      latencyMs: 2500,
    });
    expect(mockPrisma.delegatedTaskToolCall.create).toHaveBeenCalledOnce();

    // Step 6: Emit completion event
    eventBus.emit({
      type: "DELEGATED_TASK_COMPLETED",
      userId: "user-1",
      taskId: "task-1",
      toAgentTarget: "ASSISTANT",
      title: "Process customer data",
      status: "DONE",
    });
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "DELEGATED_TASK_COMPLETED", status: "DONE" }),
    );

    // Step 7: Emit runner job completion event
    eventBus.emit({
      type: "RUNNER_JOB_COMPLETED",
      userId: "user-1",
      jobId: "job-1",
      jobType: "command.exec",
      ok: true,
      errorMessage: null,
    });
    expect(mockEventBus.emit).toHaveBeenCalledTimes(3); // created + completed + runner
  });

  it("handles LLM failure with graceful fallback", async () => {
    mockGetModelRouteForAgentKind.mockResolvedValue({
      provider: "OPENAI",
      modelName: "gpt-4.1-mini",
    });
    mockGetProviderApiKeyRuntime.mockResolvedValue({
      apiKey: null,
      mode: "BYOK",
    });

    const result = await callAgentLlm({
      userId: "user-1",
      agentKind: "PROJECT_MANAGER",
      systemPrompt: "System prompt",
      userMessage: "Task message",
    });

    // Should return empty text with error, not throw
    expect(result.text).toBe("");
    expect(result.error).toBe("No OpenAI API key configured");
  });

  it("handles runner job failure in pipeline", async () => {
    mockEnqueueRunnerJob.mockResolvedValue({ id: "job-2", status: "QUEUED" });
    mockGetRunnerJobForUser.mockResolvedValue({
      status: "FAILED",
      result: null,
      errorMessage: "Script returned exit code 1",
    });

    const job = await bridgeDelegatedTaskToRunner({
      userId: "user-1",
      delegatedTaskId: "task-2",
      title: "Run failing script",
      jobType: "command.exec",
      payload: { command: "exit 1" },
    });

    const pollResult = await pollRunnerJobResult("user-1", job.id, {
      timeoutMs: 5000,
      pollIntervalMs: 100,
    });

    expect(pollResult.ok).toBe(false);
    expect(pollResult.status).toBe("FAILED");
    expect(pollResult.errorMessage).toContain("exit code 1");

    mockPrisma.delegatedTaskToolCall.create.mockResolvedValue({ id: "trace-2" });

    await captureRunnerResultAsDelegationTrace({
      delegatedTaskId: "task-2",
      jobId: job.id,
      jobType: "command.exec",
      ok: false,
      result: null,
      errorMessage: pollResult.errorMessage,
      latencyMs: 100,
    });

    const traceArgs = mockPrisma.delegatedTaskToolCall.create.mock.calls[0][0];
    expect(traceArgs.data.status).toBe("error");
    expect(traceArgs.data.outputSummary).toContain("exit code 1");
  });

  it("supports tool-calling protocol via callAgentLlmWithTools", async () => {
    mockGetModelRouteForAgentKind.mockResolvedValue({
      provider: "OPENAI",
      modelName: "gpt-4.1-mini",
    });
    mockGetProviderApiKeyRuntime.mockResolvedValue({
      apiKey: "sk-test",
      mode: "BYOK",
    });

    // OpenAI returns function_call items
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            type: "function_call",
            id: "fc-1",
            name: "list_files",
            arguments: "{}",
          },
        ],
      }),
    });

    const result = await callAgentLlmWithTools({
      userId: "user-1",
      agentKind: "ASSISTANT",
      messages: [
        { role: "system", content: "You are an assistant." },
        { role: "user", content: "List all files." },
      ],
      tools: [
        {
          type: "function",
          name: "list_files",
          description: "List business files",
          parameters: { type: "object", properties: {} },
        },
      ],
    });

    expect(result.kind).toBe("tool_calls");
    if (result.kind === "tool_calls") {
      expect(result.calls).toHaveLength(1);
      expect(result.calls[0].name).toBe("list_files");
      expect(result.calls[0].id).toBe("fc-1");
    }
  });

  it("returns text result when OpenAI responds without tool calls", async () => {
    mockGetModelRouteForAgentKind.mockResolvedValue({
      provider: "OPENAI",
      modelName: "gpt-4.1-mini",
    });
    mockGetProviderApiKeyRuntime.mockResolvedValue({
      apiKey: "sk-test",
      mode: "BYOK",
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: "Here are your files: file1.txt, file2.csv",
      }),
    });

    const result = await callAgentLlmWithTools({
      userId: "user-1",
      agentKind: "ASSISTANT",
      messages: [
        { role: "system", content: "You are an assistant." },
        { role: "user", content: "List all files." },
      ],
      tools: [],
    });

    expect(result.kind).toBe("text");
    if (result.kind === "text") {
      expect(result.text).toContain("file1.txt");
    }
  });
});
