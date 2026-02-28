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
    description: "List recent emails from Gmail inbox. Returns message IDs, sender, subject, date, and snippet for each message. Use google_read_email to fetch the full body. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        max_results: { type: "number", description: "Number of emails to return (default: 10, max: 20)" },
      },
    }),
  },
  {
    name: "google_read_email",
    category: "external",
    executionMode: "in_process",
    description: "Read the full body and headers of a specific Gmail message by ID. Use after google_list_emails to get the full content before replying. Returns from, to, subject, date, messageId, threadId, and body. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        message_id: { type: "string", description: "Gmail message ID (from google_list_emails)" },
      },
      required: ["message_id"],
    }),
  },
  {
    name: "google_send_email",
    category: "external",
    executionMode: "approval_required",
    description: "Send an email via Gmail. To reply in-thread, include thread_id and in_reply_to from the original message. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body (plain text)" },
        thread_id: { type: "string", description: "Optional Gmail thread ID to reply in the same thread (from google_read_email)" },
        in_reply_to: { type: "string", description: "Optional Message-ID of the email being replied to (from google_read_email)" },
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
  // ── QuickBooks ────────────────────────────────────────────────────────
  {
    name: "quickbooks_get_profit_loss",
    category: "external",
    executionMode: "in_process",
    description: "Fetch a Profit & Loss (Income Statement) report from QuickBooks Online for a given date range. Returns revenue, expenses, and net income by category. Requires QuickBooks integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date in YYYY-MM-DD format (default: Jan 1 of current year)" },
        end_date: { type: "string", description: "End date in YYYY-MM-DD format (default: today)" },
      },
    }),
  },
  {
    name: "quickbooks_get_balance_sheet",
    category: "external",
    executionMode: "in_process",
    description: "Fetch a Balance Sheet report from QuickBooks Online. Returns assets, liabilities, and equity. Requires QuickBooks integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        date: { type: "string", description: "Report date in YYYY-MM-DD format (default: today)" },
      },
    }),
  },
  {
    name: "quickbooks_get_cash_flow",
    category: "external",
    executionMode: "in_process",
    description: "Fetch a Cash Flow Statement from QuickBooks Online for a given date range. Requires QuickBooks integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date in YYYY-MM-DD format (default: Jan 1 of current year)" },
        end_date: { type: "string", description: "End date in YYYY-MM-DD format (default: today)" },
      },
    }),
  },
  {
    name: "quickbooks_list_invoices",
    category: "external",
    executionMode: "in_process",
    description: "List recent invoices from QuickBooks Online, ordered by date descending. Returns customer name, amount, due date, and balance. Requires QuickBooks integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        max_results: { type: "number", description: "Number of invoices to return (default: 20, max: 50)" },
      },
    }),
  },
  // ── Xero ──────────────────────────────────────────────────────────────
  {
    name: "xero_get_profit_loss",
    category: "external",
    executionMode: "in_process",
    description: "Fetch a Profit & Loss report from Xero for a given date range. Returns income, expenses, and net profit by account. Requires Xero integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        from_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
        to_date: { type: "string", description: "End date in YYYY-MM-DD format" },
      },
    }),
  },
  {
    name: "xero_get_balance_sheet",
    category: "external",
    executionMode: "in_process",
    description: "Fetch a Balance Sheet from Xero. Returns assets, liabilities, and equity. Requires Xero integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        date: { type: "string", description: "Report date in YYYY-MM-DD format (default: today)" },
      },
    }),
  },
  {
    name: "xero_get_trial_balance",
    category: "external",
    executionMode: "in_process",
    description: "Fetch a Trial Balance report from Xero. Lists all accounts with debit and credit balances. Requires Xero integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        date: { type: "string", description: "Report date in YYYY-MM-DD format (default: today)" },
      },
    }),
  },
  {
    name: "xero_list_invoices",
    category: "external",
    executionMode: "in_process",
    description: "List invoices from Xero. Use type=ACCREC for accounts receivable (money owed to you) or type=ACCPAY for accounts payable (money you owe). Requires Xero integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        type: { type: "string", description: "Invoice type: ACCREC (receivable, default) or ACCPAY (payable)" },
      },
    }),
  },
  // Calendly
  {
    name: "calendly_list_event_types",
    category: "external",
    executionMode: "in_process",
    description: "List all active Calendly booking types (e.g. '60-min Birth Chart Reading', '30-min Follow-up'). Returns name, duration, description, and scheduling URL for each type. Requires Calendly integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {},
    }),
  },
  {
    name: "calendly_list_scheduled_events",
    category: "external",
    executionMode: "in_process",
    description: "List upcoming booked appointments from Calendly. Returns start/end time, event type name, and location for each booking. Requires Calendly integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        days_ahead: { type: "number", description: "How many days ahead to look (default: 30, max: 90)" },
        status: { type: "string", enum: ["active", "canceled"], description: "Filter by status (default: active)" },
      },
    }),
  },
  {
    name: "calendly_get_event_invitees",
    category: "external",
    executionMode: "in_process",
    description: "Get the client details for a specific Calendly booking — name, email, and any pre-booking questions answered. Use this to prepare for an upcoming consult. Requires Calendly integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        event_uuid: { type: "string", description: "The Calendly event UUID (from calendly_list_scheduled_events)" },
      },
      required: ["event_uuid"],
    }),
  },
  {
    name: "calendly_create_scheduling_link",
    category: "external",
    executionMode: "in_process",
    description: "Create a one-time Calendly booking link for a specific client. Useful when following up with a lead — share the link in an email and they can book directly. Requires Calendly integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        event_type_uri: { type: "string", description: "The Calendly event type URI (from calendly_list_event_types)" },
        max_event_count: { type: "number", description: "Maximum times the link can be used (default: 1, max: 10)" },
      },
      required: ["event_type_uri"],
    }),
  },
  // ── GitHub ────────────────────────────────────────────────────────────
  {
    name: "github_list_repos",
    category: "external",
    executionMode: "in_process",
    description: "List GitHub repositories you have access to. Returns repo names, languages, and issue counts. Requires GitHub integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        limit: { type: "number", description: "Max repos to return (default: 20, max: 50)" },
      },
    }),
  },
  {
    name: "github_list_issues",
    category: "external",
    executionMode: "in_process",
    description: "List issues in a GitHub repository. Requires GitHub integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format (e.g. acme/backend)" },
        state: { type: "string", enum: ["open", "closed", "all"], description: "Filter by state (default: open)" },
        limit: { type: "number", description: "Max issues to return (default: 20, max: 50)" },
      },
      required: ["repo"],
    }),
  },
  {
    name: "github_create_issue",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new GitHub issue. Always requires human approval. Requires GitHub integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format (e.g. acme/backend)" },
        title: { type: "string", description: "Issue title" },
        body: { type: "string", description: "Issue body (Markdown supported)" },
        labels: { type: "array", items: { type: "string" }, description: "Optional labels to apply" },
        assignees: { type: "array", items: { type: "string" }, description: "Optional GitHub usernames to assign" },
      },
      required: ["repo", "title"],
    }),
  },
  {
    name: "github_list_prs",
    category: "external",
    executionMode: "in_process",
    description: "List pull requests in a GitHub repository. Requires GitHub integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format (e.g. acme/backend)" },
        state: { type: "string", enum: ["open", "closed", "all"], description: "Filter by state (default: open)" },
        limit: { type: "number", description: "Max PRs to return (default: 20, max: 50)" },
      },
      required: ["repo"],
    }),
  },
  // ── Notion ────────────────────────────────────────────────────────────
  {
    name: "notion_search",
    category: "external",
    executionMode: "in_process",
    description: "Search pages in your Notion workspace. Returns page titles, IDs, and URLs. Requires Notion integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string", description: "Search query to find pages" },
        limit: { type: "number", description: "Max results to return (default: 10, max: 20)" },
      },
      required: ["query"],
    }),
  },
  {
    name: "notion_read_page",
    category: "external",
    executionMode: "in_process",
    description: "Read the full content of a Notion page by ID. Returns title, text content, and metadata. Requires Notion integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        page_id: { type: "string", description: "Notion page ID (from notion_search or the page URL)" },
      },
      required: ["page_id"],
    }),
  },
  {
    name: "notion_create_page",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new Notion page. Always requires human approval. Requires Notion integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        title: { type: "string", description: "Page title" },
        content: { type: "string", description: "Optional page content (plain text, each line becomes a paragraph)" },
        parent_page_id: { type: "string", description: "Optional parent page ID to nest this page under" },
        parent_database_id: { type: "string", description: "Optional parent database ID to create a database entry" },
      },
      required: ["title"],
    }),
  },
  {
    name: "notion_append_block",
    category: "external",
    executionMode: "approval_required",
    description: "Append text content to an existing Notion page. Always requires human approval. Requires Notion integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        page_id: { type: "string", description: "Notion page ID to append to" },
        content: { type: "string", description: "Text content to append (each line becomes a paragraph block)" },
      },
      required: ["page_id", "content"],
    }),
  },
  // ── Stripe Finance ────────────────────────────────────────────────────
  {
    name: "stripe_get_revenue",
    category: "external",
    executionMode: "in_process",
    description: "Get a revenue overview from Stripe: available balance, last 30 days revenue, MRR, and active subscription count. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({ type: "object", properties: {} }),
  },
  {
    name: "stripe_list_customers",
    category: "external",
    executionMode: "in_process",
    description: "List Stripe customers with their names and emails. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        limit: { type: "number", description: "Max customers to return (default: 20, max: 100)" },
      },
    }),
  },
  {
    name: "stripe_list_subscriptions",
    category: "external",
    executionMode: "in_process",
    description: "List Stripe subscriptions. Returns subscription status, amount, and billing interval. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status: 'active' (default) or 'all'" },
        limit: { type: "number", description: "Max subscriptions to return (default: 20, max: 100)" },
      },
    }),
  },
  {
    name: "stripe_list_invoices",
    category: "external",
    executionMode: "in_process",
    description: "List recent paid invoices from Stripe with amounts and customer emails. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        limit: { type: "number", description: "Max invoices to return (default: 20, max: 100)" },
      },
    }),
  },
  // ── Google Docs / Sheets write ─────────────────────────────────────────
  {
    name: "google_create_doc",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new Google Doc with optional content. Always requires human approval. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        title: { type: "string", description: "Document title" },
        content: { type: "string", description: "Optional initial content (plain text)" },
      },
      required: ["title"],
    }),
  },
  {
    name: "google_append_doc",
    category: "external",
    executionMode: "approval_required",
    description: "Append content to an existing Google Doc by document ID. Always requires human approval. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        document_id: { type: "string", description: "Google Docs document ID" },
        content: { type: "string", description: "Text content to append at the end of the document" },
      },
      required: ["document_id", "content"],
    }),
  },
  {
    name: "google_create_sheet",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new Google Spreadsheet with optional column headers. Always requires human approval. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        title: { type: "string", description: "Spreadsheet title" },
        headers: { type: "array", items: { type: "string" }, description: "Optional column header names for the first row" },
      },
      required: ["title"],
    }),
  },
  {
    name: "google_append_sheet_rows",
    category: "external",
    executionMode: "approval_required",
    description: "Append rows to an existing Google Sheet. Always requires human approval. Requires Google Workspace integration connected in Settings → Integrations.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        spreadsheet_id: { type: "string", description: "Google Sheets spreadsheet ID" },
        sheet_name: { type: "string", description: "Sheet tab name (default: Sheet1)" },
        rows: { type: "array", items: { type: "array", items: { type: "string" } }, description: "Array of rows, each row is an array of cell values" },
      },
      required: ["spreadsheet_id", "rows"],
    }),
  },
  // ── Agent-scheduled follow-up ──────────────────────────────────────────
  {
    name: "schedule_followup",
    category: "orchestration",
    executionMode: "in_process",
    description: "Schedule a follow-up task for this agent (or another agent) to run at a future time. Useful for scheduling check-ins, reminders, or deferred work. Returns the scheduled task ID.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        title: { type: "string", description: "Follow-up task title (max 240 chars)" },
        instructions: { type: "string", description: "Detailed instructions for the follow-up task" },
        scheduled_for: { type: "string", description: "ISO 8601 datetime for when to run the follow-up (e.g. 2026-03-01T09:00:00Z). Defaults to 24 hours from now." },
        to_agent: { type: "string", description: "Optional: delegate to a specific agent kind. Defaults to the current agent." },
      },
      required: ["title", "instructions"],
    }),
  },
  // ── SQL Query ─────────────────────────────────────────────────────────
  {
    name: "sql_query",
    category: "read",
    executionMode: "in_process",
    description: "Run a read-only SQL SELECT query against a configured database connection. Only SELECT statements are permitted — no writes, DDL, or DML. Returns up to 200 rows as JSON. Requires a database connection configured in Settings → Database Connections.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string", description: "A SELECT SQL query to execute (no writes, DDL, or DML allowed)" },
        connection_name: { type: "string", description: "Optional: name of the database connection to use. Defaults to the first configured connection." },
      },
      required: ["query"],
    }),
  },
  // ── PDF generation ────────────────────────────────────────────────────
  {
    name: "generate_pdf",
    category: "write",
    executionMode: "in_process",
    description: "Generate a PDF document from a title and plain-text / light Markdown content (# H1, ## H2, - bullets). Saves the file to your business files and returns the file ID. Use for reports, summaries, proposals, or any document that needs to be shared as a PDF.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        title: { type: "string", description: "Document title displayed as a large heading at the top" },
        content: { type: "string", description: "Document body. Plain text or light Markdown: # H1, ## H2, - bullet items, blank lines for paragraph breaks." },
        filename: { type: "string", description: "Optional output filename (e.g. q1_report.pdf). Defaults to the title with .pdf extension." },
      },
      required: ["title", "content"],
    }),
  },
  // ── Agent performance ─────────────────────────────────────────────────
  {
    name: "agent_performance",
    category: "read",
    executionMode: "in_process",
    description: "Retrieve performance statistics for agents in this workspace: task completion rates, submission acceptance rates, average tool latency, and top tools used. Useful for reporting on workforce productivity or identifying agents that may need attention.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        agent_kind: { type: "string", description: "Optional: filter to a specific agent kind (e.g. MARKETING_COORDINATOR). Omit to see all agents." },
        days: { type: "number", description: "Number of days to look back (default: 30, max: 365)" },
      },
    }),
  },
  // ── Browser automation ────────────────────────────────────────────────
  {
    name: "browser_navigate",
    category: "browser",
    executionMode: "in_process",
    description: "Navigate a headless browser to a URL and return the page state (URL, title, visible text, links, form inputs). Use this to open web pages and read their content.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to navigate to (must be a fully-qualified http/https URL)" },
      },
      required: ["url"],
    }),
  },
  {
    name: "browser_get_content",
    category: "browser",
    executionMode: "in_process",
    description: "Extract content from the currently open browser page. Choose format: 'text' (default) for visible text, 'links' for all hyperlinks, 'inputs' for form fields, 'full' for everything.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["text", "links", "inputs", "full"],
          description: "Content format to extract (default: text)",
        },
      },
    }),
  },
  {
    name: "browser_screenshot",
    category: "browser",
    executionMode: "in_process",
    description: "Take a screenshot of the current browser page and save it to .data/screenshots/. Returns the filename and current page state.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {},
    }),
  },
  {
    name: "browser_click",
    category: "browser",
    executionMode: "in_process",
    description: "Click an element on the current page by visible text or CSS selector. Returns the new page state after the click (navigation may occur).",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        text: { type: "string", description: "Visible text of the element to click (e.g. 'Submit', 'Login')" },
        selector: { type: "string", description: "CSS selector of the element to click (e.g. 'button.primary', '#submit-btn')" },
      },
    }),
  },
  {
    name: "browser_type",
    category: "browser",
    executionMode: "in_process",
    description: "Type text into a form field on the current page. Optionally press Enter to submit. Returns the page state after typing.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of the input field (defaults to first visible input/textarea)" },
        text: { type: "string", description: "Text to type into the field" },
        submit: { type: "boolean", description: "Whether to press Enter after typing (default: false)" },
      },
      required: ["text"],
    }),
  },
];

const AGENT_TOOL_ASSIGNMENTS: Record<string, string[]> = {
  CHIEF_ADVISOR: [
    "read_file", "list_files", "search_business_logs", "get_project_details",
    "list_inbox_items", "web_fetch", "run_command", "write_file",
    "delegate_task", "send_email", "call_webhook", "create_business_log",
    "figma_get_design", "figma_get_image", "web_search", "extract_content",
    "schedule_followup", "sql_query", "generate_pdf", "agent_performance",
    // HubSpot
    "hubspot_search_contacts", "hubspot_create_contact", "hubspot_update_contact",
    "hubspot_list_deals", "hubspot_create_note",
    // Slack
    "slack_list_channels", "slack_post_message",
    // Google full suite including Docs/Sheets write
    "google_list_emails", "google_read_email", "google_send_email", "google_list_calendar_events",
    "google_create_calendar_event", "google_list_drive_files", "google_read_drive_file",
    "google_create_doc", "google_append_doc", "google_create_sheet", "google_append_sheet_rows",
    // Linear
    "linear_list_issues", "linear_create_issue", "linear_update_issue",
    // Calendly all 4
    "calendly_list_event_types", "calendly_list_scheduled_events",
    "calendly_get_event_invitees", "calendly_create_scheduling_link",
    // GitHub
    "github_list_repos", "github_list_issues", "github_create_issue", "github_list_prs",
    // Notion
    "notion_search", "notion_read_page", "notion_create_page", "notion_append_block",
    // Browser automation: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
  ],
  MARKETING_COORDINATOR: [
    "search_business_logs", "list_files", "read_file", "web_fetch",
    "delegate_task", "create_business_log", "send_email", "list_inbox_items",
    "figma_get_design", "figma_get_image", "schedule_followup",
    // Google full suite
    "google_list_emails", "google_read_email", "google_send_email", "google_list_calendar_events",
    "google_create_calendar_event", "google_list_drive_files", "google_read_drive_file",
    "google_create_doc", "google_append_doc", "google_create_sheet", "google_append_sheet_rows",
    // Slack
    "slack_list_channels", "slack_post_message",
    // Notion
    "notion_search", "notion_read_page", "notion_create_page", "notion_append_block",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
  ],
  ASSISTANT: [
    "read_file", "list_files", "search_business_logs", "list_inbox_items",
    "web_fetch", "run_command", "write_file", "send_email", "call_webhook",
    "create_business_log", "delegate_task",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
  ],
  SALES_REP: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "web_fetch", "send_email", "call_webhook", "delegate_task", "list_inbox_items",
    // HubSpot all 5 + Slack + Linear list/update
    "hubspot_search_contacts", "hubspot_create_contact", "hubspot_update_contact",
    "hubspot_list_deals", "hubspot_create_note",
    "slack_list_channels", "slack_post_message",
    "linear_list_issues", "linear_update_issue",
    // Calendly: view bookings + create booking links for leads
    "calendly_list_event_types", "calendly_list_scheduled_events",
    "calendly_create_scheduling_link",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
  ],
  CUSTOMER_SUCCESS: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "send_email", "list_inbox_items", "delegate_task", "call_webhook",
    // HubSpot search/update/note + Slack
    "hubspot_search_contacts", "hubspot_update_contact", "hubspot_create_note",
    "slack_list_channels", "slack_post_message",
    // Calendly: view upcoming client bookings
    "calendly_list_event_types", "calendly_list_scheduled_events",
    "calendly_get_event_invitees",
    // Browser: navigate/content/screenshot only (no click/type)
    "browser_navigate", "browser_get_content", "browser_screenshot",
  ],
  FINANCE_ANALYST: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "list_inbox_items", "get_project_details", "sql_query",
    "google_list_drive_files", "google_read_drive_file",
    "google_create_doc", "google_append_doc", "google_create_sheet", "google_append_sheet_rows",
    // QuickBooks
    "quickbooks_get_profit_loss", "quickbooks_get_balance_sheet",
    "quickbooks_get_cash_flow", "quickbooks_list_invoices",
    // Xero
    "xero_get_profit_loss", "xero_get_balance_sheet",
    "xero_get_trial_balance", "xero_list_invoices",
    // Stripe
    "stripe_get_revenue", "stripe_list_customers",
    "stripe_list_subscriptions", "stripe_list_invoices",
  ],
  OPERATIONS_MANAGER: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "web_fetch", "send_email", "call_webhook", "delegate_task", "list_inbox_items",
    "schedule_followup", "sql_query",
    // Linear all 3 + Slack
    "linear_list_issues", "linear_create_issue", "linear_update_issue",
    "slack_list_channels", "slack_post_message",
    // GitHub
    "github_list_repos", "github_list_issues", "github_create_issue", "github_list_prs",
    // Notion
    "notion_search", "notion_read_page", "notion_create_page", "notion_append_block",
    // Google Docs
    "google_create_doc", "google_append_doc", "google_create_sheet", "google_append_sheet_rows",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
  ],
  EXECUTIVE_ASSISTANT: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "list_inbox_items", "send_email", "get_project_details", "schedule_followup",
    // Google Gmail + Calendar + Docs
    "google_list_emails", "google_read_email", "google_send_email",
    "google_list_calendar_events", "google_create_calendar_event",
    "google_list_drive_files", "google_read_drive_file",
    "google_create_doc", "google_append_doc",
    // Slack
    "slack_list_channels",
    // Notion
    "notion_search", "notion_read_page", "notion_create_page", "notion_append_block",
    // Calendly all 4
    "calendly_list_event_types", "calendly_list_scheduled_events",
    "calendly_get_event_invitees", "calendly_create_scheduling_link",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
  ],
  RESEARCH_ANALYST: [
    "web_search", "extract_content", "quality_review",
    "search_business_logs", "create_business_log",
    "list_files", "read_file", "delegate_task", "list_inbox_items",
    "sql_query",
    "notion_search", "notion_read_page", "notion_create_page",
    "google_list_drive_files", "google_read_drive_file",
    "google_create_doc", "google_append_doc",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
  ],
  SEO_SPECIALIST: [
    "web_search", "extract_content", "web_fetch", "quality_review",
    "search_business_logs", "create_business_log",
    "list_files", "read_file", "delegate_task", "list_inbox_items",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
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
