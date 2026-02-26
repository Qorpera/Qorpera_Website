import { prisma } from "@/lib/db";

type ToolSeedRow = {
  name: string;
  description: string;
  parametersJson: string;
  executionMode: "in_process" | "runner" | "approval_required";
  category: string;
};

const TOOL_SEEDS: ToolSeedRow[] = [
  {
    name: "read_file",
    category: "read",
    executionMode: "in_process",
    description: "Read text contents of a business file by ID. Returns the extracted text or an error if not found.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        file_id: { type: "string", description: "The business file ID to read" },
      },
      required: ["file_id"],
    }),
  },
  {
    name: "list_files",
    category: "read",
    executionMode: "in_process",
    description: "List business files with optional category filter. Returns file names, categories, and IDs.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        category: { type: "string", description: "Optional category filter (e.g. FINANCIAL, PROJECT, GENERAL)" },
        limit: { type: "number", description: "Max files to return (default 20)" },
      },
    }),
  },
  {
    name: "search_business_logs",
    category: "read",
    executionMode: "in_process",
    description: "Search business log entries by keyword and/or category. Returns matching log titles and summaries.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword to match against log titles and bodies" },
        category: { type: "string", description: "Optional category filter (e.g. FINANCIAL, OPERATIONS, GENERAL)" },
        limit: { type: "number", description: "Max entries to return (default 10)" },
      },
    }),
  },
  {
    name: "get_project_details",
    category: "read",
    executionMode: "in_process",
    description: "Get project details by slug. Returns project name, goal, health status, board columns, artifacts, and timeline.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        slug: { type: "string", description: "The project slug identifier" },
      },
      required: ["slug"],
    }),
  },
  {
    name: "list_inbox_items",
    category: "read",
    executionMode: "in_process",
    description: "List current inbox items and their approval states. Returns item summaries and statuses.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        filter: { type: "string", description: "Optional filter: 'approvals' for approval items only, 'open' for open items only" },
      },
    }),
  },
  {
    name: "web_fetch",
    category: "read",
    executionMode: "in_process",
    description: "Fetch a URL and return its text content. Only public http/https URLs are allowed. HTML is stripped to plain text.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to fetch (must be public http/https)" },
      },
      required: ["url"],
    }),
  },
  {
    name: "run_command",
    category: "write",
    executionMode: "runner",
    description: "Execute a shell command via the runner daemon. Returns stdout/stderr. Requires a connected runner node.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        command: { type: "string", description: "The shell command to execute" },
        cwd: { type: "string", description: "Optional working directory" },
      },
      required: ["command"],
    }),
  },
  {
    name: "write_file",
    category: "write",
    executionMode: "runner",
    description: "Write content to a file via the runner daemon. Requires a connected runner node.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        path: { type: "string", description: "File path to write to" },
        content: { type: "string", description: "Content to write" },
      },
      required: ["path", "content"],
    }),
  },
  {
    name: "delegate_task",
    category: "orchestration",
    executionMode: "in_process",
    description: "Create a sub-task delegated to another agent. Returns the created task ID.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        to_agent: { type: "string", description: "Target agent kind: ASSISTANT, PROJECT_MANAGER, SALES_REP, CUSTOMER_SUCCESS, MARKETING_COORDINATOR, FINANCE_ANALYST, OPERATIONS_MANAGER, or EXECUTIVE_ASSISTANT" },
        title: { type: "string", description: "Task title (max 240 chars)" },
        instructions: { type: "string", description: "Detailed instructions for the agent (max 12000 chars)" },
      },
      required: ["to_agent", "title", "instructions"],
    }),
  },
  {
    name: "send_email",
    category: "external",
    executionMode: "approval_required",
    description: "Send an email. Always requires human approval before sending. Provide recipient, subject, and body.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body text" },
      },
      required: ["to", "subject", "body"],
    }),
  },
  {
    name: "call_webhook",
    category: "external",
    executionMode: "approval_required",
    description: "Send an HTTP webhook to an external URL. Requires human approval before firing. Use this to trigger Zapier, Make, n8n, or any custom endpoint.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        url: { type: "string", description: "The webhook URL to POST to" },
        payload: { type: "object", description: "JSON payload to send in the request body" },
        method: { type: "string", description: "HTTP method (default: POST)" },
      },
      required: ["url"],
    }),
  },
  {
    name: "create_business_log",
    category: "orchestration",
    executionMode: "in_process",
    description: "Create a new business log entry to record findings, decisions, or action items.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        title: { type: "string", description: "Log entry title (max 240 chars)" },
        body: { type: "string", description: "Log entry body (max 12000 chars)" },
        category: { type: "string", description: "Optional category: FINANCIAL, PROJECT, COLLABORATION, OPERATIONS, SALES, MARKETING, LEGAL, GENERAL" },
      },
      required: ["title", "body"],
    }),
  },
];

const AGENT_TOOL_ASSIGNMENTS: Record<string, string[]> = {
  CHIEF_ADVISOR: [
    "read_file", "list_files", "search_business_logs", "get_project_details",
    "list_inbox_items", "web_fetch", "run_command", "write_file",
    "delegate_task", "send_email", "call_webhook", "create_business_log",
  ],
  ASSISTANT: [
    "read_file", "list_files", "search_business_logs", "list_inbox_items",
    "web_fetch", "run_command", "write_file", "send_email", "call_webhook",
    "create_business_log", "delegate_task",
  ],
  PROJECT_MANAGER: [
    "read_file", "list_files", "search_business_logs", "get_project_details",
    "list_inbox_items", "web_fetch", "create_business_log", "delegate_task",
    "run_command", "write_file", "send_email", "call_webhook",
  ],
};

export async function seedToolDefinitions() {
  for (const seed of TOOL_SEEDS) {
    await prisma.toolDefinition.upsert({
      where: { name: seed.name },
      update: {
        description: seed.description,
        parametersJson: seed.parametersJson,
        executionMode: seed.executionMode,
        category: seed.category,
      },
      create: {
        name: seed.name,
        description: seed.description,
        parametersJson: seed.parametersJson,
        executionMode: seed.executionMode,
        category: seed.category,
      },
    });
  }

  const allTools = await prisma.toolDefinition.findMany();
  const toolByName = new Map(allTools.map((t) => [t.name, t]));

  for (const [agentKind, toolNames] of Object.entries(AGENT_TOOL_ASSIGNMENTS)) {
    for (const toolName of toolNames) {
      const tool = toolByName.get(toolName);
      if (!tool) continue;
      const existing = await prisma.agentKindToolSet.findUnique({
        where: { agentKind_toolDefinitionId: { agentKind, toolDefinitionId: tool.id } },
      });
      if (!existing) {
        await prisma.agentKindToolSet.create({
          data: { agentKind, toolDefinitionId: tool.id },
        });
      }
    }
  }
}
