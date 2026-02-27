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
        to_agent: { type: "string", description: "Target agent kind: ASSISTANT, SALES_REP, CUSTOMER_SUCCESS, MARKETING_COORDINATOR, FINANCE_ANALYST, OPERATIONS_MANAGER, EXECUTIVE_ASSISTANT, RESEARCH_ANALYST, or SEO_SPECIALIST" },
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
  // ── HubSpot ──────────────────────────────────────────────────────────
  {
    name: "hubspot_search_contacts",
    category: "external",
    executionMode: "in_process",
    description: "Search HubSpot CRM contacts by name or email. Returns up to 10 matching contact records with key properties. Requires HubSpot integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string", description: "Search query — name fragment or email address" },
      },
      required: ["query"],
    }),
  },
  {
    name: "hubspot_create_contact",
    category: "external",
    executionMode: "in_process",
    description: "Create a new contact in HubSpot CRM. Requires HubSpot integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        properties: {
          type: "object",
          description: "Contact properties as key-value pairs (e.g. {\"firstname\": \"Jane\", \"email\": \"jane@example.com\", \"company\": \"Acme\"})",
        },
      },
      required: ["properties"],
    }),
  },
  {
    name: "hubspot_update_contact",
    category: "external",
    executionMode: "in_process",
    description: "Update properties on an existing HubSpot contact by ID. Requires HubSpot integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        contact_id: { type: "string", description: "HubSpot contact ID" },
        properties: { type: "object", description: "Fields to update as key-value pairs" },
      },
      required: ["contact_id", "properties"],
    }),
  },
  {
    name: "hubspot_list_deals",
    category: "external",
    executionMode: "in_process",
    description: "List open deals from HubSpot CRM including deal name, amount, stage, and close date. Requires HubSpot integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {},
    }),
  },
  {
    name: "hubspot_create_note",
    category: "external",
    executionMode: "in_process",
    description: "Create a note in HubSpot CRM, optionally associated with a contact. Requires HubSpot integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        body: { type: "string", description: "Note content (plain text)" },
        contact_id: { type: "string", description: "Optional HubSpot contact ID to associate the note with" },
      },
      required: ["body"],
    }),
  },
  // ── Slack ─────────────────────────────────────────────────────────────
  {
    name: "slack_list_channels",
    category: "external",
    executionMode: "in_process",
    description: "List Slack channels in the connected workspace. Returns channel IDs and names. Requires Slack integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {},
    }),
  },
  {
    name: "slack_post_message",
    category: "external",
    executionMode: "approval_required",
    description: "Post a message to a Slack channel. Always requires human approval before sending. Requires Slack integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID or name (e.g. C01ABC123 or #general)" },
        text: { type: "string", description: "Message text to post" },
      },
      required: ["channel", "text"],
    }),
  },
  // ── Google Workspace ──────────────────────────────────────────────────
  {
    name: "google_list_emails",
    category: "external",
    executionMode: "in_process",
    description: "List recent emails from Gmail inbox. Returns sender, subject, date, and snippet for each message. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        max_results: { type: "number", description: "Number of emails to return (default: 10, max: 20)" },
      },
    }),
  },
  {
    name: "google_send_email",
    category: "external",
    executionMode: "approval_required",
    description: "Send an email via Gmail. Always requires human approval before sending. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body (plain text)" },
      },
      required: ["to", "subject", "body"],
    }),
  },
  {
    name: "google_list_calendar_events",
    category: "external",
    executionMode: "in_process",
    description: "List upcoming Google Calendar events. Returns event summaries, start/end times, and attendees. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        days_ahead: { type: "number", description: "Number of days ahead to fetch events for (default: 7, max: 30)" },
      },
    }),
  },
  {
    name: "google_create_calendar_event",
    category: "external",
    executionMode: "approval_required",
    description: "Create a Google Calendar event. Always requires human approval. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        summary: { type: "string", description: "Event title" },
        start_datetime: { type: "string", description: "Start time in ISO 8601 format (e.g. 2026-03-01T10:00:00-07:00)" },
        end_datetime: { type: "string", description: "End time in ISO 8601 format" },
        description: { type: "string", description: "Optional event description" },
        attendees: { type: "array", items: { type: "string" }, description: "Optional list of attendee email addresses" },
      },
      required: ["summary", "start_datetime", "end_datetime"],
    }),
  },
  {
    name: "google_list_drive_files",
    category: "external",
    executionMode: "in_process",
    description: "List files in Google Drive. Optionally filter by search query. Returns file IDs, names, and MIME types. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string", description: "Optional full-text search query to filter files" },
      },
    }),
  },
  {
    name: "google_read_drive_file",
    category: "external",
    executionMode: "in_process",
    description: "Read the text content of a Google Drive file by ID. Google Docs/Sheets/Slides are exported as plain text. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        file_id: { type: "string", description: "Google Drive file ID" },
        mime_type: { type: "string", description: "Optional MIME type hint (used to detect Google Docs exports)" },
      },
      required: ["file_id"],
    }),
  },
  // ── Linear ────────────────────────────────────────────────────────────
  {
    name: "linear_list_issues",
    category: "external",
    executionMode: "in_process",
    description: "List issues from Linear. Optionally filter by team. Returns title, state, priority, and assignee. Requires Linear integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        team_id: { type: "string", description: "Optional Linear team ID to filter issues" },
        first: { type: "number", description: "Number of issues to return (default: 20, max: 50)" },
      },
    }),
  },
  {
    name: "linear_create_issue",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new issue in Linear. Always requires human approval. Priority: 0=none, 1=urgent, 2=high, 3=medium, 4=low. Requires Linear integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        team_id: { type: "string", description: "Linear team ID to create the issue in" },
        title: { type: "string", description: "Issue title" },
        description: { type: "string", description: "Optional issue description (Markdown supported)" },
        priority: { type: "number", description: "Priority: 0=none, 1=urgent, 2=high, 3=medium, 4=low" },
        assignee_id: { type: "string", description: "Optional Linear user ID to assign the issue to" },
      },
      required: ["team_id", "title"],
    }),
  },
  {
    name: "linear_update_issue",
    category: "external",
    executionMode: "in_process",
    description: "Update an existing Linear issue by ID. Pass any fields to change in the input object. Requires Linear integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        issue_id: { type: "string", description: "Linear issue ID" },
        input: { type: "object", description: "Fields to update (e.g. {\"title\": \"New title\", \"stateId\": \"...\"})" },
      },
      required: ["issue_id", "input"],
    }),
  },
];

const AGENT_TOOL_ASSIGNMENTS: Record<string, string[]> = {
  CHIEF_ADVISOR: [
    "read_file", "list_files", "search_business_logs", "get_project_details",
    "list_inbox_items", "web_fetch", "run_command", "write_file",
    "delegate_task", "send_email", "call_webhook", "create_business_log",
    "figma_get_design", "figma_get_image", "web_search", "extract_content",
    // All 16 integration tools
    "hubspot_search_contacts", "hubspot_create_contact", "hubspot_update_contact",
    "hubspot_list_deals", "hubspot_create_note",
    "slack_list_channels", "slack_post_message",
    "google_list_emails", "google_send_email", "google_list_calendar_events",
    "google_create_calendar_event", "google_list_drive_files", "google_read_drive_file",
    "linear_list_issues", "linear_create_issue", "linear_update_issue",
  ],
  MARKETING_COORDINATOR: [
    "search_business_logs", "list_files", "read_file", "web_fetch",
    "delegate_task", "create_business_log", "send_email", "list_inbox_items",
    "figma_get_design", "figma_get_image",
    // Google all 6 + Slack
    "google_list_emails", "google_send_email", "google_list_calendar_events",
    "google_create_calendar_event", "google_list_drive_files", "google_read_drive_file",
    "slack_list_channels", "slack_post_message",
  ],
  ASSISTANT: [
    "read_file", "list_files", "search_business_logs", "list_inbox_items",
    "web_fetch", "run_command", "write_file", "send_email", "call_webhook",
    "create_business_log", "delegate_task",
  ],
  SALES_REP: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "web_fetch", "send_email", "call_webhook", "delegate_task", "list_inbox_items",
    // HubSpot all 5 + Slack + Linear list/update
    "hubspot_search_contacts", "hubspot_create_contact", "hubspot_update_contact",
    "hubspot_list_deals", "hubspot_create_note",
    "slack_list_channels", "slack_post_message",
    "linear_list_issues", "linear_update_issue",
  ],
  CUSTOMER_SUCCESS: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "send_email", "list_inbox_items", "delegate_task", "call_webhook",
    // HubSpot search/update/note + Slack
    "hubspot_search_contacts", "hubspot_update_contact", "hubspot_create_note",
    "slack_list_channels", "slack_post_message",
  ],
  FINANCE_ANALYST: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "list_inbox_items", "get_project_details",
  ],
  OPERATIONS_MANAGER: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "web_fetch", "send_email", "call_webhook", "delegate_task", "list_inbox_items",
    // Linear all 3 + Slack
    "linear_list_issues", "linear_create_issue", "linear_update_issue",
    "slack_list_channels", "slack_post_message",
  ],
  EXECUTIVE_ASSISTANT: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "list_inbox_items", "send_email", "get_project_details",
    // Google Gmail + Calendar + Slack list
    "google_list_emails", "google_send_email",
    "google_list_calendar_events", "google_create_calendar_event",
    "slack_list_channels",
  ],
  RESEARCH_ANALYST: [
    "web_search", "extract_content", "quality_review",
    "search_business_logs", "create_business_log",
    "list_files", "read_file", "delegate_task", "list_inbox_items",
  ],
  SEO_SPECIALIST: [
    "web_search", "extract_content", "web_fetch", "quality_review",
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
