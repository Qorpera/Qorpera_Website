import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCallAgentLlmWithTools, mockPrisma } = vi.hoisted(() => ({
  mockCallAgentLlmWithTools: vi.fn(),
  mockPrisma: {
    delegatedTaskToolCall: { create: vi.fn() },
    businessFile: { findFirst: vi.fn() },
    businessLogEntry: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/agent-llm", () => ({
  callAgentLlmWithTools: mockCallAgentLlmWithTools,
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

// Mock all tool-executor dependencies
vi.mock("@/lib/business-files-store", () => ({ listBusinessFiles: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/business-logs-store", () => ({
  listBusinessLogs: vi.fn().mockResolvedValue([]),
  createBusinessLog: vi.fn().mockResolvedValue({ id: "log-1" }),
}));
vi.mock("@/lib/workspace-store", () => ({ getProjectsForUser: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/inbox-store", () => ({ getInboxItems: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/orchestration-store", () => ({ createDelegatedTask: vi.fn().mockResolvedValue({ id: "task-1" }) }));
vi.mock("@/lib/runner-bridge", () => ({
  bridgeDelegatedTaskToRunner: vi.fn(),
  pollRunnerJobResult: vi.fn(),
}));

vi.mock("@/lib/model-routing-store", () => ({
  getModelRouteForAgentKind: vi.fn().mockResolvedValue({ provider: "OPENAI", modelName: "gpt-4.1-mini" }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { runAgenticLoop } from "@/lib/agentic-loop";
import type { ToolDefinitionView } from "@/lib/tool-registry";

const baseTools: ToolDefinitionView[] = [
  {
    name: "list_files",
    description: "List business files",
    parameters: { type: "object", properties: {} },
    executionMode: "in_process",
    category: "read",
  },
  {
    name: "search_business_logs",
    description: "Search business logs",
    parameters: { type: "object", properties: { query: { type: "string" } } },
    executionMode: "in_process",
    category: "read",
  },
];

const baseConfig = {
  maxTurns: 5,
  maxRuntimeMs: 30000,
  maxParallelCalls: 4,
  maxToolRetries: 2,
  requireApproval: false,
};

describe("runAgenticLoop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.delegatedTaskToolCall.create.mockResolvedValue({ id: "trace-1" });
  });

  it("returns no_tools when tools array is empty", async () => {
    const result = await runAgenticLoop({
      userId: "user-1",
      delegatedTaskId: "task-1",
      agentKind: "ASSISTANT",
      systemPrompt: "You are an assistant.",
      userMessage: "Do something.",
      tools: [],
      config: baseConfig,
    });

    expect(result.terminationReason).toBe("no_tools");
    expect(result.turns).toBe(0);
  });

  it("returns final_answer when LLM responds with text on first turn", async () => {
    mockCallAgentLlmWithTools.mockResolvedValue({
      kind: "text",
      text: "Here is your answer based on the task.",
      provider: "OPENAI",
      model: "gpt-4.1-mini",
    });

    const result = await runAgenticLoop({
      userId: "user-1",
      delegatedTaskId: "task-1",
      agentKind: "ASSISTANT",
      systemPrompt: "You are an assistant.",
      userMessage: "What files do we have?",
      tools: baseTools,
      config: baseConfig,
    });

    expect(result.terminationReason).toBe("final_answer");
    expect(result.finalText).toBe("Here is your answer based on the task.");
    expect(result.turns).toBe(1);
    expect(result.totalToolCalls).toBe(0);
  });

  it("executes tool calls then returns final answer", async () => {
    // Turn 1: LLM requests tool call
    mockCallAgentLlmWithTools.mockResolvedValueOnce({
      kind: "tool_calls",
      calls: [
        { id: "tc-1", name: "list_files", arguments: "{}" },
      ],
      provider: "OPENAI",
      model: "gpt-4.1-mini",
    });

    // Turn 2: LLM returns final answer
    mockCallAgentLlmWithTools.mockResolvedValueOnce({
      kind: "text",
      text: "Based on the files I found, here is the summary.",
      provider: "OPENAI",
      model: "gpt-4.1-mini",
    });

    const result = await runAgenticLoop({
      userId: "user-1",
      delegatedTaskId: "task-1",
      agentKind: "ASSISTANT",
      systemPrompt: "You are an assistant.",
      userMessage: "Summarize our files.",
      tools: baseTools,
      config: baseConfig,
    });

    expect(result.terminationReason).toBe("final_answer");
    expect(result.turns).toBe(2);
    expect(result.totalToolCalls).toBe(1);
    expect(result.finalText).toContain("summary");
    expect(mockCallAgentLlmWithTools).toHaveBeenCalledTimes(2);
  });

  it("handles multi-turn with parallel tool calls", async () => {
    // Turn 1: LLM requests two tool calls
    mockCallAgentLlmWithTools.mockResolvedValueOnce({
      kind: "tool_calls",
      calls: [
        { id: "tc-1", name: "list_files", arguments: "{}" },
        { id: "tc-2", name: "search_business_logs", arguments: '{"query":"sales"}' },
      ],
      provider: "OPENAI",
      model: "gpt-4.1-mini",
    });

    // Turn 2: Final answer
    mockCallAgentLlmWithTools.mockResolvedValueOnce({
      kind: "text",
      text: "Analysis complete.",
      provider: "OPENAI",
      model: "gpt-4.1-mini",
    });

    const result = await runAgenticLoop({
      userId: "user-1",
      delegatedTaskId: "task-1",
      agentKind: "ASSISTANT",
      systemPrompt: "You are an assistant.",
      userMessage: "Analyze sales data.",
      tools: baseTools,
      config: baseConfig,
    });

    expect(result.totalToolCalls).toBe(2);
    expect(result.terminationReason).toBe("final_answer");
    // Verify traces include both tool executions
    const toolTraces = result.traces.filter((t) => t.toolName === "list_files" || t.toolName === "search_business_logs");
    expect(toolTraces).toHaveLength(2);
  });

  it("terminates on max_turns when LLM keeps requesting tools", async () => {
    // Every turn: LLM requests a tool call
    mockCallAgentLlmWithTools.mockResolvedValue({
      kind: "tool_calls",
      calls: [{ id: "tc-loop", name: "list_files", arguments: "{}" }],
      provider: "OPENAI",
      model: "gpt-4.1-mini",
    });

    const result = await runAgenticLoop({
      userId: "user-1",
      delegatedTaskId: "task-1",
      agentKind: "ASSISTANT",
      systemPrompt: "You are an assistant.",
      userMessage: "Keep checking files.",
      tools: baseTools,
      config: { ...baseConfig, maxTurns: 3 },
    });

    expect(result.terminationReason).toBe("max_turns");
    expect(result.turns).toBe(3);
    expect(result.totalToolCalls).toBe(3);
  });

  it("returns error when LLM returns error", async () => {
    mockCallAgentLlmWithTools.mockResolvedValue({
      kind: "error",
      error: "No OpenAI API key configured",
      provider: "OPENAI",
      model: "gpt-4.1-mini",
    });

    const result = await runAgenticLoop({
      userId: "user-1",
      delegatedTaskId: "task-1",
      agentKind: "ASSISTANT",
      systemPrompt: "You are an assistant.",
      userMessage: "Do something.",
      tools: baseTools,
      config: baseConfig,
    });

    expect(result.terminationReason).toBe("error");
    expect(result.finalText).toContain("No OpenAI API key configured");
  });

  it("tracks approval_required from tool execution", async () => {
    // Turn 1: LLM requests send_email
    mockCallAgentLlmWithTools.mockResolvedValueOnce({
      kind: "tool_calls",
      calls: [
        { id: "tc-email", name: "send_email", arguments: '{"to":"user@example.com","subject":"Hi","body":"Test"}' },
      ],
      provider: "OPENAI",
      model: "gpt-4.1-mini",
    });

    // Turn 2: Final answer
    mockCallAgentLlmWithTools.mockResolvedValueOnce({
      kind: "text",
      text: "Email has been queued for approval.",
      provider: "OPENAI",
      model: "gpt-4.1-mini",
    });

    const tools: ToolDefinitionView[] = [
      ...baseTools,
      {
        name: "send_email",
        description: "Send email",
        parameters: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } } },
        executionMode: "approval_required",
        category: "external",
      },
    ];

    const result = await runAgenticLoop({
      userId: "user-1",
      delegatedTaskId: "task-1",
      agentKind: "ASSISTANT",
      systemPrompt: "You are an assistant.",
      userMessage: "Send follow-up email.",
      tools,
      config: baseConfig,
    });

    expect(result.approvalRequired).toHaveLength(1);
    expect(result.approvalRequired[0].toolName).toBe("send_email");
  });

  it("records DelegatedTaskToolCall traces for each tool execution", async () => {
    mockCallAgentLlmWithTools.mockResolvedValueOnce({
      kind: "tool_calls",
      calls: [{ id: "tc-1", name: "list_files", arguments: "{}" }],
      provider: "OPENAI",
      model: "gpt-4.1-mini",
    });
    mockCallAgentLlmWithTools.mockResolvedValueOnce({
      kind: "text",
      text: "Done.",
      provider: "OPENAI",
      model: "gpt-4.1-mini",
    });

    await runAgenticLoop({
      userId: "user-1",
      delegatedTaskId: "task-1",
      agentKind: "ASSISTANT",
      systemPrompt: "You are an assistant.",
      userMessage: "List files.",
      tools: baseTools,
      config: baseConfig,
    });

    expect(mockPrisma.delegatedTaskToolCall.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          delegatedTaskId: "task-1",
          toolName: "list_files",
          phase: "agentic:turn:1",
        }),
      }),
    );
  });
});
