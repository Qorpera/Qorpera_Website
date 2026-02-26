import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockListBusinessFiles, mockListBusinessLogs, mockCreateBusinessLog,
  mockGetProjectsForUser, mockGetInboxItems, mockCreateDelegatedTask,
  mockBridgeDelegatedTaskToRunner, mockPollRunnerJobResult } = vi.hoisted(() => ({
  mockPrisma: {
    businessFile: { findFirst: vi.fn() },
    delegatedTaskToolCall: { create: vi.fn() },
  },
  mockListBusinessFiles: vi.fn(),
  mockListBusinessLogs: vi.fn(),
  mockCreateBusinessLog: vi.fn(),
  mockGetProjectsForUser: vi.fn(),
  mockGetInboxItems: vi.fn(),
  mockCreateDelegatedTask: vi.fn(),
  mockBridgeDelegatedTaskToRunner: vi.fn(),
  mockPollRunnerJobResult: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/business-files-store", () => ({ listBusinessFiles: mockListBusinessFiles }));
vi.mock("@/lib/business-logs-store", () => ({
  listBusinessLogs: mockListBusinessLogs,
  createBusinessLog: mockCreateBusinessLog,
}));
vi.mock("@/lib/workspace-store", () => ({ getProjectsForUser: mockGetProjectsForUser }));
vi.mock("@/lib/inbox-store", () => ({ getInboxItems: mockGetInboxItems }));
vi.mock("@/lib/orchestration-store", () => ({ createDelegatedTask: mockCreateDelegatedTask }));
vi.mock("@/lib/runner-bridge", () => ({
  bridgeDelegatedTaskToRunner: mockBridgeDelegatedTaskToRunner,
  pollRunnerJobResult: mockPollRunnerJobResult,
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { executeToolCall, executeToolCallsParallel, type ToolExecutionContext } from "@/lib/tool-executor";
import type { ToolCallRequest } from "@/lib/agent-llm";
import type { ToolDefinitionView } from "@/lib/tool-registry";

const ctx: ToolExecutionContext = {
  userId: "user-1",
  delegatedTaskId: "task-1",
  agentKind: "ASSISTANT",
  requireApproval: false,
};

function makeDef(name: string, executionMode = "in_process", category = "read"): ToolDefinitionView {
  return {
    name,
    description: `Tool: ${name}`,
    parameters: { type: "object", properties: {} },
    executionMode: executionMode as ToolDefinitionView["executionMode"],
    category,
  };
}

function makeCall(name: string, args: Record<string, unknown> = {}): ToolCallRequest {
  return { id: `call-${name}`, name, arguments: JSON.stringify(args) };
}

describe("executeToolCall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("read_file", () => {
    it("returns file textExtract when available", async () => {
      mockPrisma.businessFile.findFirst.mockResolvedValue({
        id: "file-1",
        name: "report.txt",
        textExtract: "This is the file content",
        storagePath: "/path/to/file",
      });

      const result = await executeToolCall(
        makeCall("read_file", { file_id: "file-1" }),
        makeDef("read_file"),
        ctx,
      );

      expect(result.status).toBe("ok");
      expect(result.output).toBe("This is the file content");
    });

    it("returns error for missing file", async () => {
      mockPrisma.businessFile.findFirst.mockResolvedValue(null);

      const result = await executeToolCall(
        makeCall("read_file", { file_id: "nonexistent" }),
        makeDef("read_file"),
        ctx,
      );

      expect(result.status).toBe("ok");
      expect(result.output).toContain("File not found");
    });

    it("returns error when file_id is missing", async () => {
      const result = await executeToolCall(
        makeCall("read_file", {}),
        makeDef("read_file"),
        ctx,
      );

      expect(result.output).toContain("file_id is required");
    });
  });

  describe("list_files", () => {
    it("returns file listing as JSON", async () => {
      mockListBusinessFiles.mockResolvedValue([
        { id: "f1", name: "doc.txt", category: "GENERAL", mimeType: "text/plain", sizeBytes: 100, createdAt: new Date("2025-01-01") },
        { id: "f2", name: "data.csv", category: "FINANCIAL", mimeType: "text/csv", sizeBytes: 500, createdAt: new Date("2025-01-02") },
      ]);

      const result = await executeToolCall(
        makeCall("list_files", {}),
        makeDef("list_files"),
        ctx,
      );

      expect(result.status).toBe("ok");
      const parsed = JSON.parse(result.output);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe("doc.txt");
    });

    it("filters by category", async () => {
      mockListBusinessFiles.mockResolvedValue([
        { id: "f1", name: "doc.txt", category: "GENERAL", mimeType: "text/plain", sizeBytes: 100, createdAt: new Date() },
        { id: "f2", name: "data.csv", category: "FINANCIAL", mimeType: "text/csv", sizeBytes: 500, createdAt: new Date() },
      ]);

      const result = await executeToolCall(
        makeCall("list_files", { category: "financial" }),
        makeDef("list_files"),
        ctx,
      );

      const parsed = JSON.parse(result.output);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].category).toBe("FINANCIAL");
    });
  });

  describe("search_business_logs", () => {
    it("filters logs by query", async () => {
      mockListBusinessLogs.mockResolvedValue([
        { id: "l1", title: "Sales report", body: "Q4 sales data", category: "SALES", source: "AGENT", createdAt: new Date() },
        { id: "l2", title: "Ops update", body: "Server migration", category: "OPERATIONS", source: "OWNER", createdAt: new Date() },
      ]);

      const result = await executeToolCall(
        makeCall("search_business_logs", { query: "sales" }),
        makeDef("search_business_logs"),
        ctx,
      );

      const parsed = JSON.parse(result.output);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe("Sales report");
    });
  });

  describe("get_project_details", () => {
    it("returns project details by slug", async () => {
      mockGetProjectsForUser.mockResolvedValue([
        { id: "p1", slug: "my-project", name: "My Project", goal: "Ship it", status: "Active", workforceHealth: "green", board: [], artifacts: [], timeline: [] },
      ]);

      const result = await executeToolCall(
        makeCall("get_project_details", { slug: "my-project" }),
        makeDef("get_project_details"),
        ctx,
      );

      expect(result.status).toBe("ok");
      const parsed = JSON.parse(result.output);
      expect(parsed.name).toBe("My Project");
    });

    it("returns error for unknown slug", async () => {
      mockGetProjectsForUser.mockResolvedValue([]);

      const result = await executeToolCall(
        makeCall("get_project_details", { slug: "nonexistent" }),
        makeDef("get_project_details"),
        ctx,
      );

      expect(result.output).toContain("Project not found");
    });
  });

  describe("list_inbox_items", () => {
    it("returns inbox items", async () => {
      mockGetInboxItems.mockResolvedValue([
        { id: "i1", type: "approval", summary: "Review email draft", state: "open", stateLabel: "Open" },
        { id: "i2", type: "task", summary: "Update CRM", state: "approved", stateLabel: "Approved" },
      ]);

      const result = await executeToolCall(
        makeCall("list_inbox_items", {}),
        makeDef("list_inbox_items"),
        ctx,
      );

      const parsed = JSON.parse(result.output);
      expect(parsed).toHaveLength(2);
    });

    it("filters approvals only", async () => {
      mockGetInboxItems.mockResolvedValue([
        { id: "i1", type: "approval", summary: "Review email draft", state: "open" },
        { id: "i2", type: "task", summary: "Update CRM", state: "open" },
      ]);

      const result = await executeToolCall(
        makeCall("list_inbox_items", { filter: "approvals" }),
        makeDef("list_inbox_items"),
        ctx,
      );

      const parsed = JSON.parse(result.output);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("approval");
    });
  });

  describe("web_fetch", () => {
    it("fetches URL and returns text content", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => "text/html" },
        text: async () => "<html><body>Hello world</body></html>",
      });

      const result = await executeToolCall(
        makeCall("web_fetch", { url: "https://example.com" }),
        makeDef("web_fetch"),
        ctx,
      );

      expect(result.status).toBe("ok");
      expect(result.output).toContain("Hello world");
    });

    it("blocks private URLs", async () => {
      const result = await executeToolCall(
        makeCall("web_fetch", { url: "http://localhost:3000" }),
        makeDef("web_fetch"),
        ctx,
      );

      expect(result.output).toContain("blocked");
    });
  });

  describe("delegate_task", () => {
    it("creates a delegated task", async () => {
      mockCreateDelegatedTask.mockResolvedValue({ id: "task-new" });

      const result = await executeToolCall(
        makeCall("delegate_task", { to_agent: "ASSISTANT", title: "Do something", instructions: "Details here" }),
        makeDef("delegate_task", "in_process", "orchestration"),
        ctx,
      );

      expect(result.status).toBe("ok");
      expect(result.output).toContain("task-new");
    });
  });

  describe("create_business_log", () => {
    it("creates a business log entry", async () => {
      mockCreateBusinessLog.mockResolvedValue({ id: "log-1" });

      const result = await executeToolCall(
        makeCall("create_business_log", { title: "Meeting notes", body: "Discussed Q4 goals" }),
        makeDef("create_business_log", "in_process", "orchestration"),
        ctx,
      );

      expect(result.status).toBe("ok");
      expect(result.output).toContain("log-1");
    });
  });

  describe("send_email", () => {
    it("always returns approval_required status", async () => {
      const result = await executeToolCall(
        makeCall("send_email", { to: "user@example.com", subject: "Hello", body: "Test" }),
        makeDef("send_email", "approval_required", "external"),
        ctx,
      );

      expect(result.status).toBe("approval_required");
      expect(result.output).toContain("approval");
    });
  });

  describe("run_command (runner)", () => {
    it("dispatches to runner and returns output", async () => {
      mockBridgeDelegatedTaskToRunner.mockResolvedValue({ id: "job-1" });
      mockPollRunnerJobResult.mockResolvedValue({
        ok: true,
        status: "SUCCEEDED",
        result: { output: "command output here" },
        errorMessage: null,
      });

      const result = await executeToolCall(
        makeCall("run_command", { command: "ls -la" }),
        makeDef("run_command", "runner", "write"),
        ctx,
      );

      expect(result.status).toBe("ok");
      expect(result.output).toBe("command output here");
    });

    it("handles runner failure", async () => {
      mockBridgeDelegatedTaskToRunner.mockResolvedValue({ id: "job-2" });
      mockPollRunnerJobResult.mockResolvedValue({
        ok: false,
        status: "FAILED",
        result: null,
        errorMessage: "exit code 1",
      });

      const result = await executeToolCall(
        makeCall("run_command", { command: "bad-cmd" }),
        makeDef("run_command", "runner", "write"),
        ctx,
      );

      expect(result.output).toContain("exit code 1");
    });
  });

  describe("error handling", () => {
    it("handles invalid JSON arguments", async () => {
      const result = await executeToolCall(
        { id: "call-1", name: "read_file", arguments: "not-json" },
        makeDef("read_file"),
        ctx,
      );

      expect(result.status).toBe("error");
      expect(result.output).toContain("Could not parse arguments");
    });

    it("handles unknown tool name", async () => {
      const result = await executeToolCall(
        makeCall("nonexistent_tool"),
        makeDef("nonexistent_tool"),
        ctx,
      );

      expect(result.status).toBe("error");
      expect(result.output).toContain("Unknown tool");
    });
  });
});

describe("executeToolCallsParallel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes multiple calls in parallel", async () => {
    mockListBusinessFiles.mockResolvedValue([
      { id: "f1", name: "doc.txt", category: "GENERAL", mimeType: "text/plain", sizeBytes: 100, createdAt: new Date() },
    ]);
    mockListBusinessLogs.mockResolvedValue([
      { id: "l1", title: "Log 1", body: "Content", category: "GENERAL", source: "OWNER", createdAt: new Date() },
    ]);

    const calls = [
      makeCall("list_files"),
      makeCall("search_business_logs", { query: "test" }),
    ];

    const defs = new Map<string, ToolDefinitionView>([
      ["list_files", makeDef("list_files")],
      ["search_business_logs", makeDef("search_business_logs")],
    ]);

    const results = await executeToolCallsParallel(calls, defs, ctx, 4);
    expect(results.size).toBe(2);
    expect(results.get("call-list_files")?.status).toBe("ok");
    expect(results.get("call-search_business_logs")?.status).toBe("ok");
  });

  it("returns error for unknown tool in batch", async () => {
    const calls = [makeCall("unknown_tool")];
    const defs = new Map<string, ToolDefinitionView>();

    const results = await executeToolCallsParallel(calls, defs, ctx, 4);
    expect(results.get("call-unknown_tool")?.status).toBe("error");
    expect(results.get("call-unknown_tool")?.output).toContain("Unknown tool");
  });
});
