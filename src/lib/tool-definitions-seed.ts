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
        to_agent: { type: "string", description: "Target agent kind: ASSISTANT, SALES_REP, CUSTOMER_SUCCESS, MARKETING_COORDINATOR, FINANCE_ANALYST, OPERATIONS_MANAGER, EXECUTIVE_ASSISTANT, or RESEARCH_ANALYST" },
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
  {
    name: "figma_get_design",
    category: "read",
    executionMode: "in_process",
    description: "Fetch design data from a Figma file or node. Returns colors, typography, dimensions, and component structure. Requires FIGMA_ACCESS_TOKEN skill credential.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        file_key: { type: "string", description: "Figma file key (from URL: figma.com/file/{FILE_KEY}/...)" },
        node_id: { type: "string", description: "Optional node/frame ID to scope to a specific component or frame" },
      },
      required: ["file_key"],
    }),
  },
  {
    name: "figma_get_image",
    category: "read",
    executionMode: "in_process",
    description: "Export a Figma frame or component as an image URL (PNG/SVG). Returns a temporary URL valid ~1 hour. Requires FIGMA_ACCESS_TOKEN skill credential.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        file_key: { type: "string", description: "Figma file key" },
        node_id: { type: "string", description: "Node/frame ID to export" },
        format: { type: "string", enum: ["png", "svg", "pdf"], description: "Export format (default: png)" },
        scale: { type: "number", description: "Export scale 1–4 (default: 1)" },
      },
      required: ["file_key", "node_id"],
    }),
  },
  {
    name: "web_search",
    category: "read",
    executionMode: "in_process",
    description: "Search the web using Tavily API. Returns titles, URLs, and content snippets for the top results. Requires TAVILY_API_KEY skill credential.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        search_depth: { type: "string", description: "Search depth: 'basic' or 'advanced' (default: basic)" },
        max_results: { type: "number", description: "Maximum results to return (default: 5)" },
      },
      required: ["query"],
    }),
  },
  {
    name: "extract_content",
    category: "read",
    executionMode: "in_process",
    description: "Extract and read the full content of a web page URL. Returns clean text suitable for analysis. Falls back to basic fetch if Tavily extract is unavailable.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to extract content from" },
        max_length: { type: "number", description: "Maximum content length to return (default: 8000)" },
      },
      required: ["url"],
    }),
  },
  {
    name: "quality_review",
    category: "read",
    executionMode: "in_process",
    description: "Submit a research draft for quality review by a stronger cloud model. Returns critique, confidence score, and suggested improvements. Use this before finalizing any research output.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        draft: { type: "string", description: "The research content to review" },
        review_focus: { type: "string", description: "What to evaluate: 'factual_accuracy', 'completeness', 'reasoning', or 'all' (default: all)" },
        context: { type: "string", description: "Background context for the reviewer" },
      },
      required: ["draft"],
    }),
  },
];

const AGENT_TOOL_ASSIGNMENTS: Record<string, string[]> = {
  CHIEF_ADVISOR: [
    "read_file", "list_files", "search_business_logs", "get_project_details",
    "list_inbox_items", "web_fetch", "run_command", "write_file",
    "delegate_task", "send_email", "call_webhook", "create_business_log",
    "figma_get_design", "figma_get_image", "web_search", "extract_content",
  ],
  MARKETING_COORDINATOR: [
    "search_business_logs", "list_files", "read_file", "web_fetch",
    "delegate_task", "create_business_log", "send_email", "list_inbox_items",
    "figma_get_design", "figma_get_image",
  ],
  ASSISTANT: [
    "read_file", "list_files", "search_business_logs", "list_inbox_items",
    "web_fetch", "run_command", "write_file", "send_email", "call_webhook",
    "create_business_log", "delegate_task",
  ],
  SALES_REP: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "web_fetch", "send_email", "call_webhook", "delegate_task", "list_inbox_items",
  ],
  CUSTOMER_SUCCESS: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "send_email", "list_inbox_items", "delegate_task", "call_webhook",
  ],
  FINANCE_ANALYST: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "list_inbox_items", "get_project_details",
  ],
  OPERATIONS_MANAGER: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "web_fetch", "send_email", "call_webhook", "delegate_task", "list_inbox_items",
  ],
  EXECUTIVE_ASSISTANT: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "list_inbox_items", "send_email", "get_project_details",
  ],
  RESEARCH_ANALYST: [
    "web_search", "extract_content", "quality_review",
    "search_business_logs", "create_business_log",
    "list_files", "read_file", "delegate_task", "list_inbox_items",
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
