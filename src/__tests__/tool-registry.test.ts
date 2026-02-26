import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    agentKindToolSet: { findMany: vi.fn() },
    toolDefinition: { findMany: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { getToolsForAgentKind, toolDefsToLlmSpecs, getIntegrationToToolMapping } from "@/lib/tool-registry";

const makeToolDef = (name: string, category = "read", executionMode = "in_process") => ({
  id: `tool-${name}`,
  name,
  description: `Description for ${name}`,
  parametersJson: JSON.stringify({ type: "object", properties: { arg1: { type: "string" } } }),
  executionMode,
  category,
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("getToolsForAgentKind", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tools for agent kind joined from AgentKindToolSet", async () => {
    const toolDef = makeToolDef("read_file");
    mockPrisma.agentKindToolSet.findMany.mockResolvedValue([
      { id: "ats-1", agentKind: "ASSISTANT", toolDefinitionId: toolDef.id, enabled: true, toolDefinition: toolDef },
    ]);

    const tools = await getToolsForAgentKind("ASSISTANT");
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("read_file");
    expect(tools[0].executionMode).toBe("in_process");
    expect(tools[0].parameters).toEqual({ type: "object", properties: { arg1: { type: "string" } } });
  });

  it("returns empty array when no tool sets exist", async () => {
    mockPrisma.agentKindToolSet.findMany.mockResolvedValue([]);
    const tools = await getToolsForAgentKind("UNKNOWN_AGENT");
    expect(tools).toHaveLength(0);
  });

  it("filters by user allowlist using integration key mapping", async () => {
    const readFile = makeToolDef("read_file");
    const listFiles = makeToolDef("list_files");
    const sendEmail = makeToolDef("send_email", "external", "approval_required");

    mockPrisma.agentKindToolSet.findMany.mockResolvedValue([
      { id: "ats-1", agentKind: "ASSISTANT", toolDefinitionId: readFile.id, enabled: true, toolDefinition: readFile },
      { id: "ats-2", agentKind: "ASSISTANT", toolDefinitionId: listFiles.id, enabled: true, toolDefinition: listFiles },
      { id: "ats-3", agentKind: "ASSISTANT", toolDefinitionId: sendEmail.id, enabled: true, toolDefinition: sendEmail },
    ]);

    // Only allow "files" integration key -> maps to read_file + list_files
    const tools = await getToolsForAgentKind("ASSISTANT", ["files"]);
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name).sort()).toEqual(["list_files", "read_file"]);
  });

  it("excludes disabled tool definitions", async () => {
    const disabledTool = { ...makeToolDef("disabled_tool"), enabled: false };
    mockPrisma.agentKindToolSet.findMany.mockResolvedValue([
      { id: "ats-1", agentKind: "ASSISTANT", toolDefinitionId: disabledTool.id, enabled: true, toolDefinition: disabledTool },
    ]);

    const tools = await getToolsForAgentKind("ASSISTANT");
    expect(tools).toHaveLength(0);
  });

  it("handles invalid parametersJson gracefully", async () => {
    const badTool = { ...makeToolDef("bad_tool"), parametersJson: "not-json" };
    mockPrisma.agentKindToolSet.findMany.mockResolvedValue([
      { id: "ats-1", agentKind: "ASSISTANT", toolDefinitionId: badTool.id, enabled: true, toolDefinition: badTool },
    ]);

    const tools = await getToolsForAgentKind("ASSISTANT");
    expect(tools).toHaveLength(1);
    expect(tools[0].parameters).toEqual({ type: "object", properties: {} });
  });
});

describe("toolDefsToLlmSpecs", () => {
  it("converts tool definitions to LLM-ready format", () => {
    const tools = [
      {
        name: "read_file",
        description: "Read a file",
        parameters: { type: "object", properties: { id: { type: "string" } } },
        executionMode: "in_process" as const,
        category: "read",
      },
    ];

    const specs = toolDefsToLlmSpecs(tools);
    expect(specs).toHaveLength(1);
    expect(specs[0]).toEqual({
      type: "function",
      name: "read_file",
      description: "Read a file",
      parameters: { type: "object", properties: { id: { type: "string" } } },
    });
  });
});

describe("getIntegrationToToolMapping", () => {
  it("maps files to read_file and list_files", () => {
    const mapping = getIntegrationToToolMapping();
    expect(mapping.files).toEqual(["read_file", "list_files"]);
    expect(mapping.business_files).toEqual(["read_file", "list_files"]);
  });

  it("maps email to send_email", () => {
    const mapping = getIntegrationToToolMapping();
    expect(mapping.email).toEqual(["send_email"]);
  });

  it("maps review_queue to list_inbox_items", () => {
    const mapping = getIntegrationToToolMapping();
    expect(mapping.review_queue).toEqual(["list_inbox_items"]);
  });
});
