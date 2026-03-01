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
  // ── Data Apps ────────────────────────────────────────────────────────
  {
    name: "generate_data_app",
    category: "orchestration",
    executionMode: "in_process",
    description: "Generate a visual data application from business data. Creates rack maps, data tables, or KPI dashboards. The app is stored and viewable at /data-apps/[id].",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        app_type: { type: "string", description: "Type of visualization: 'rack-map' (server/hardware layout), 'table' (data table with sorting/grouping), or 'kpi-grid' (metric cards dashboard)" },
        title: { type: "string", description: "Title for the data app (max 240 chars)" },
        description: { type: "string", description: "Description of what to visualize and any specific requirements" },
        file_ids: { type: "array", items: { type: "string" }, description: "Optional array of business file IDs to use as data source (max 5)" },
      },
      required: ["app_type", "title", "description"],
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
  // ── HubSpot expanded ─────────────────────────────────────────────────
  {
    name: "hubspot_create_deal",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new deal in HubSpot CRM. Always requires human approval. Requires HubSpot integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        properties: { type: "object", description: "Deal properties (e.g. {\"dealname\": \"Acme Q2\", \"amount\": \"5000\", \"pipeline\": \"default\", \"dealstage\": \"appointmentscheduled\"})" },
      },
      required: ["properties"],
    }),
  },
  {
    name: "hubspot_update_deal",
    category: "external",
    executionMode: "in_process",
    description: "Update properties on an existing HubSpot deal by ID. Requires HubSpot integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        deal_id: { type: "string", description: "HubSpot deal ID" },
        properties: { type: "object", description: "Fields to update" },
      },
      required: ["deal_id", "properties"],
    }),
  },
  {
    name: "hubspot_get_deal",
    category: "external",
    executionMode: "in_process",
    description: "Get a specific HubSpot deal by ID with all properties. Requires HubSpot integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        deal_id: { type: "string", description: "HubSpot deal ID" },
      },
      required: ["deal_id"],
    }),
  },
  {
    name: "hubspot_list_pipeline_stages",
    category: "external",
    executionMode: "in_process",
    description: "List all deal pipelines and their stages from HubSpot. Useful for understanding sales workflow. Requires HubSpot integration.",
    parametersJson: JSON.stringify({ type: "object", properties: {} }),
  },
  {
    name: "hubspot_create_company",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new company in HubSpot CRM. Always requires human approval. Requires HubSpot integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        properties: { type: "object", description: "Company properties (e.g. {\"name\": \"Acme Inc\", \"domain\": \"acme.com\", \"industry\": \"SaaS\"})" },
      },
      required: ["properties"],
    }),
  },
  {
    name: "hubspot_search_companies",
    category: "external",
    executionMode: "in_process",
    description: "Search HubSpot companies by name or domain. Returns matching company records. Requires HubSpot integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string", description: "Search query — company name or domain" },
      },
      required: ["query"],
    }),
  },
  {
    name: "hubspot_list_activities",
    category: "external",
    executionMode: "in_process",
    description: "List recent engagement activities for a HubSpot contact (calls, emails, meetings, notes). Requires HubSpot integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        contact_id: { type: "string", description: "HubSpot contact ID to list activities for" },
        limit: { type: "number", description: "Max activities to return (default: 20)" },
      },
      required: ["contact_id"],
    }),
  },
  {
    name: "hubspot_create_engagement",
    category: "external",
    executionMode: "approval_required",
    description: "Create an engagement (note, email, call, meeting) in HubSpot, optionally linked to a contact. Always requires human approval. Requires HubSpot integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        type: { type: "string", description: "Engagement type: NOTE, EMAIL, CALL, MEETING" },
        body: { type: "string", description: "Engagement content/body" },
        contact_id: { type: "string", description: "Contact ID to associate the engagement with" },
      },
      required: ["type", "body", "contact_id"],
    }),
  },
  {
    name: "hubspot_list_contact_lists",
    category: "external",
    executionMode: "in_process",
    description: "List contact lists (static and dynamic) from HubSpot. Requires HubSpot integration.",
    parametersJson: JSON.stringify({ type: "object", properties: {} }),
  },
  {
    name: "hubspot_get_custom_properties",
    category: "external",
    executionMode: "in_process",
    description: "Get custom properties for a HubSpot object type (contacts, deals, companies). Useful for understanding available CRM fields. Requires HubSpot integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        object_type: { type: "string", description: "Object type: contacts, deals, or companies (default: contacts)" },
      },
    }),
  },
  // ── Slack expanded ──────────────────────────────────────────────────
  {
    name: "slack_add_reaction",
    category: "external",
    executionMode: "in_process",
    description: "Add an emoji reaction to a Slack message. Requires Slack integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID" },
        timestamp: { type: "string", description: "Message timestamp (ts)" },
        name: { type: "string", description: "Emoji name without colons (e.g. thumbsup)" },
      },
      required: ["channel", "timestamp", "name"],
    }),
  },
  {
    name: "slack_reply_to_thread",
    category: "external",
    executionMode: "approval_required",
    description: "Reply in a Slack message thread. Always requires human approval. Requires Slack integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID" },
        thread_ts: { type: "string", description: "Parent message timestamp" },
        text: { type: "string", description: "Reply text" },
      },
      required: ["channel", "thread_ts", "text"],
    }),
  },
  {
    name: "slack_create_channel",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new Slack channel. Always requires human approval. Requires Slack integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        name: { type: "string", description: "Channel name (lowercase, no spaces)" },
        is_private: { type: "boolean", description: "Whether the channel is private (default: false)" },
      },
      required: ["name"],
    }),
  },
  {
    name: "slack_invite_to_channel",
    category: "external",
    executionMode: "approval_required",
    description: "Invite a user to a Slack channel. Always requires human approval. Requires Slack integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID" },
        user_id: { type: "string", description: "Slack user ID to invite" },
      },
      required: ["channel", "user_id"],
    }),
  },
  {
    name: "slack_lookup_user",
    category: "external",
    executionMode: "in_process",
    description: "Look up a Slack user by email address. Returns user ID, name, and profile. Requires Slack integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        email: { type: "string", description: "Email address to look up" },
      },
      required: ["email"],
    }),
  },
  {
    name: "slack_list_users",
    category: "external",
    executionMode: "in_process",
    description: "List members of the Slack workspace. Returns user IDs, names, and emails. Requires Slack integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        limit: { type: "number", description: "Max users to return (default: 50)" },
      },
    }),
  },
  {
    name: "slack_schedule_message",
    category: "external",
    executionMode: "approval_required",
    description: "Schedule a Slack message for future delivery. Always requires human approval. Requires Slack integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID" },
        text: { type: "string", description: "Message text" },
        post_at: { type: "number", description: "Unix timestamp for when to send" },
      },
      required: ["channel", "text", "post_at"],
    }),
  },
  {
    name: "slack_set_channel_topic",
    category: "external",
    executionMode: "approval_required",
    description: "Set the topic of a Slack channel. Always requires human approval. Requires Slack integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID" },
        topic: { type: "string", description: "New channel topic text" },
      },
      required: ["channel", "topic"],
    }),
  },
  // ── Linear expanded ─────────────────────────────────────────────────
  {
    name: "linear_list_projects",
    category: "external",
    executionMode: "in_process",
    description: "List projects from Linear with status, progress, and lead info. Requires Linear integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        first: { type: "number", description: "Number of projects to return (default: 20)" },
      },
    }),
  },
  {
    name: "linear_create_project",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new project in Linear. Always requires human approval. Requires Linear integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        team_ids: { type: "array", items: { type: "string" }, description: "Team IDs associated with the project" },
        description: { type: "string", description: "Optional project description" },
      },
      required: ["name", "team_ids"],
    }),
  },
  {
    name: "linear_list_labels",
    category: "external",
    executionMode: "in_process",
    description: "List issue labels from Linear. Returns label names, colors, and IDs. Requires Linear integration.",
    parametersJson: JSON.stringify({ type: "object", properties: {} }),
  },
  {
    name: "linear_create_comment",
    category: "external",
    executionMode: "approval_required",
    description: "Add a comment to a Linear issue. Always requires human approval. Requires Linear integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        issue_id: { type: "string", description: "Linear issue ID" },
        body: { type: "string", description: "Comment body (Markdown supported)" },
      },
      required: ["issue_id", "body"],
    }),
  },
  {
    name: "linear_list_cycles",
    category: "external",
    executionMode: "in_process",
    description: "List cycles (sprints) from Linear with status and dates. Requires Linear integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        team_id: { type: "string", description: "Team ID to list cycles for" },
      },
      required: ["team_id"],
    }),
  },
  {
    name: "linear_get_roadmap",
    category: "external",
    executionMode: "in_process",
    description: "Get the Linear roadmap with project milestones and progress. Requires Linear integration.",
    parametersJson: JSON.stringify({ type: "object", properties: {} }),
  },
  {
    name: "linear_update_project",
    category: "external",
    executionMode: "in_process",
    description: "Update a Linear project's properties (name, description, state). Requires Linear integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        project_id: { type: "string", description: "Linear project ID" },
        input: { type: "object", description: "Fields to update (e.g. {\"name\": \"New name\", \"state\": \"completed\"})" },
      },
      required: ["project_id", "input"],
    }),
  },
  {
    name: "linear_get_issue_history",
    category: "external",
    executionMode: "in_process",
    description: "Get the change history of a Linear issue (state changes, assignments, edits). Requires Linear integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        issue_id: { type: "string", description: "Linear issue ID" },
      },
      required: ["issue_id"],
    }),
  },
  // ── Notion expanded ─────────────────────────────────────────────────
  {
    name: "notion_query_database",
    category: "external",
    executionMode: "in_process",
    description: "Query a Notion database with optional filters. Returns matching entries with properties. Requires Notion integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        database_id: { type: "string", description: "Notion database ID" },
        filter: { type: "object", description: "Optional Notion filter object" },
        page_size: { type: "number", description: "Max results (default: 20, max: 100)" },
      },
      required: ["database_id"],
    }),
  },
  {
    name: "notion_create_database_entry",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new entry in a Notion database. Always requires human approval. Requires Notion integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        database_id: { type: "string", description: "Notion database ID" },
        properties: { type: "object", description: "Entry properties matching the database schema" },
      },
      required: ["database_id", "properties"],
    }),
  },
  {
    name: "notion_update_page",
    category: "external",
    executionMode: "approval_required",
    description: "Update properties on a Notion page or database entry. Always requires human approval. Requires Notion integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        page_id: { type: "string", description: "Notion page ID" },
        properties: { type: "object", description: "Properties to update" },
      },
      required: ["page_id", "properties"],
    }),
  },
  {
    name: "notion_delete_page",
    category: "external",
    executionMode: "approval_required",
    description: "Archive (soft-delete) a Notion page. Always requires human approval. Requires Notion integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        page_id: { type: "string", description: "Notion page ID to archive" },
      },
      required: ["page_id"],
    }),
  },
  {
    name: "notion_list_databases",
    category: "external",
    executionMode: "in_process",
    description: "List databases in your Notion workspace. Returns database titles and IDs. Requires Notion integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        limit: { type: "number", description: "Max databases to return (default: 10)" },
      },
    }),
  },
  // ── GitHub expanded ─────────────────────────────────────────────────
  {
    name: "github_create_pr",
    category: "external",
    executionMode: "approval_required",
    description: "Create a pull request on GitHub. Always requires human approval. Requires GitHub integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format" },
        title: { type: "string", description: "PR title" },
        body: { type: "string", description: "PR description (Markdown)" },
        head: { type: "string", description: "Branch with changes" },
        base: { type: "string", description: "Target branch (default: main)" },
      },
      required: ["repo", "title", "head"],
    }),
  },
  {
    name: "github_merge_pr",
    category: "external",
    executionMode: "approval_required",
    description: "Merge a pull request on GitHub. Always requires human approval. Requires GitHub integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format" },
        pull_number: { type: "number", description: "PR number" },
        merge_method: { type: "string", description: "Merge method: merge, squash, or rebase (default: merge)" },
      },
      required: ["repo", "pull_number"],
    }),
  },
  {
    name: "github_list_workflow_runs",
    category: "external",
    executionMode: "in_process",
    description: "List recent GitHub Actions workflow runs for a repository. Requires GitHub integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format" },
        limit: { type: "number", description: "Max runs to return (default: 10)" },
      },
      required: ["repo"],
    }),
  },
  {
    name: "github_trigger_workflow",
    category: "external",
    executionMode: "approval_required",
    description: "Trigger a GitHub Actions workflow dispatch event. Always requires human approval. Requires GitHub integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format" },
        workflow_id: { type: "string", description: "Workflow file name (e.g. deploy.yml) or ID" },
        ref: { type: "string", description: "Branch or tag to run on (default: main)" },
        inputs: { type: "object", description: "Optional workflow input parameters" },
      },
      required: ["repo", "workflow_id"],
    }),
  },
  {
    name: "github_add_label",
    category: "external",
    executionMode: "in_process",
    description: "Add labels to a GitHub issue or pull request. Requires GitHub integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format" },
        issue_number: { type: "number", description: "Issue or PR number" },
        labels: { type: "array", items: { type: "string" }, description: "Labels to add" },
      },
      required: ["repo", "issue_number", "labels"],
    }),
  },
  {
    name: "github_update_issue",
    category: "external",
    executionMode: "in_process",
    description: "Update a GitHub issue (title, body, state, assignees, labels). Requires GitHub integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format" },
        issue_number: { type: "number", description: "Issue number" },
        title: { type: "string", description: "New title" },
        body: { type: "string", description: "New body" },
        state: { type: "string", description: "State: open or closed" },
        assignees: { type: "array", items: { type: "string" }, description: "Assignee usernames" },
      },
      required: ["repo", "issue_number"],
    }),
  },
  {
    name: "github_create_comment",
    category: "external",
    executionMode: "approval_required",
    description: "Create a comment on a GitHub issue or PR. Always requires human approval. Requires GitHub integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format" },
        issue_number: { type: "number", description: "Issue or PR number" },
        body: { type: "string", description: "Comment body (Markdown)" },
      },
      required: ["repo", "issue_number", "body"],
    }),
  },
  {
    name: "github_list_branches",
    category: "external",
    executionMode: "in_process",
    description: "List branches in a GitHub repository. Requires GitHub integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format" },
        limit: { type: "number", description: "Max branches to return (default: 30)" },
      },
      required: ["repo"],
    }),
  },
  {
    name: "github_get_commit",
    category: "external",
    executionMode: "in_process",
    description: "Get details of a specific Git commit from GitHub (message, author, files changed). Requires GitHub integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format" },
        ref: { type: "string", description: "Commit SHA or branch name" },
      },
      required: ["repo", "ref"],
    }),
  },
  {
    name: "github_compare_commits",
    category: "external",
    executionMode: "in_process",
    description: "Compare two commits/branches on GitHub. Shows ahead/behind counts and changed files. Requires GitHub integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/repo format" },
        base: { type: "string", description: "Base commit/branch" },
        head: { type: "string", description: "Head commit/branch" },
      },
      required: ["repo", "base", "head"],
    }),
  },
  // ── Jira ────────────────────────────────────────────────────────────
  {
    name: "jira_list_projects",
    category: "external",
    executionMode: "in_process",
    description: "List Jira projects you have access to. Returns project keys, names, and types. Requires Jira integration.",
    parametersJson: JSON.stringify({ type: "object", properties: {} }),
  },
  {
    name: "jira_list_issues",
    category: "external",
    executionMode: "in_process",
    description: "List issues from a Jira project or search with JQL. Returns issue keys, summaries, statuses, and assignees. Requires Jira integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        project_key: { type: "string", description: "Jira project key (e.g. PROJ)" },
        jql: { type: "string", description: "Optional JQL query to filter issues" },
        max_results: { type: "number", description: "Max issues to return (default: 20, max: 50)" },
      },
    }),
  },
  {
    name: "jira_get_issue",
    category: "external",
    executionMode: "in_process",
    description: "Get full details of a Jira issue by key (e.g. PROJ-123). Returns summary, description, status, assignee, priority, and comments. Requires Jira integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        issue_key: { type: "string", description: "Jira issue key (e.g. PROJ-123)" },
      },
      required: ["issue_key"],
    }),
  },
  {
    name: "jira_create_issue",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new Jira issue. Always requires human approval. Requires Jira integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        project_key: { type: "string", description: "Jira project key" },
        summary: { type: "string", description: "Issue summary/title" },
        description: { type: "string", description: "Issue description" },
        issue_type: { type: "string", description: "Issue type: Task, Bug, Story, Epic (default: Task)" },
        priority: { type: "string", description: "Priority: Highest, High, Medium, Low, Lowest" },
        assignee_id: { type: "string", description: "Optional Jira account ID to assign" },
      },
      required: ["project_key", "summary"],
    }),
  },
  {
    name: "jira_update_issue",
    category: "external",
    executionMode: "in_process",
    description: "Update fields on an existing Jira issue. Requires Jira integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        issue_key: { type: "string", description: "Jira issue key" },
        fields: { type: "object", description: "Fields to update (e.g. {\"summary\": \"New title\", \"priority\": {\"name\": \"High\"}})" },
      },
      required: ["issue_key", "fields"],
    }),
  },
  {
    name: "jira_add_comment",
    category: "external",
    executionMode: "approval_required",
    description: "Add a comment to a Jira issue. Always requires human approval. Requires Jira integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        issue_key: { type: "string", description: "Jira issue key" },
        body: { type: "string", description: "Comment text" },
      },
      required: ["issue_key", "body"],
    }),
  },
  {
    name: "jira_transition_issue",
    category: "external",
    executionMode: "approval_required",
    description: "Transition a Jira issue to a new status (e.g. To Do → In Progress → Done). Always requires human approval. Use jira_list_transitions first to see available transitions. Requires Jira integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        issue_key: { type: "string", description: "Jira issue key" },
        transition_id: { type: "string", description: "Transition ID (from jira_list_transitions)" },
      },
      required: ["issue_key", "transition_id"],
    }),
  },
  {
    name: "jira_list_transitions",
    category: "external",
    executionMode: "in_process",
    description: "List available status transitions for a Jira issue. Use before jira_transition_issue. Requires Jira integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        issue_key: { type: "string", description: "Jira issue key" },
      },
      required: ["issue_key"],
    }),
  },
  {
    name: "jira_assign_issue",
    category: "external",
    executionMode: "in_process",
    description: "Assign a Jira issue to a user by account ID. Requires Jira integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        issue_key: { type: "string", description: "Jira issue key" },
        account_id: { type: "string", description: "Jira account ID of the assignee" },
      },
      required: ["issue_key", "account_id"],
    }),
  },
  {
    name: "jira_search_users",
    category: "external",
    executionMode: "in_process",
    description: "Search for Jira users by name or email. Returns account IDs for assignment. Requires Jira integration.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string", description: "Name or email to search for" },
      },
      required: ["query"],
    }),
  },
  // ── Stripe expanded ─────────────────────────────────────────────────
  {
    name: "stripe_get_customer",
    category: "external",
    executionMode: "in_process",
    description: "Get a specific Stripe customer by ID with full details. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        customer_id: { type: "string", description: "Stripe customer ID (cus_...)" },
      },
      required: ["customer_id"],
    }),
  },
  {
    name: "stripe_create_customer",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new Stripe customer. Always requires human approval. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        email: { type: "string", description: "Customer email" },
        name: { type: "string", description: "Customer name" },
        description: { type: "string", description: "Optional description" },
      },
    }),
  },
  {
    name: "stripe_get_invoice",
    category: "external",
    executionMode: "in_process",
    description: "Get a specific Stripe invoice by ID with full details. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        invoice_id: { type: "string", description: "Stripe invoice ID (in_...)" },
      },
      required: ["invoice_id"],
    }),
  },
  {
    name: "stripe_create_invoice",
    category: "external",
    executionMode: "approval_required",
    description: "Create a new Stripe invoice for a customer. Always requires human approval. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        customer_id: { type: "string", description: "Stripe customer ID" },
        description: { type: "string", description: "Optional invoice description" },
      },
      required: ["customer_id"],
    }),
  },
  {
    name: "stripe_get_subscription",
    category: "external",
    executionMode: "in_process",
    description: "Get a specific Stripe subscription by ID with full details. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        subscription_id: { type: "string", description: "Stripe subscription ID (sub_...)" },
      },
      required: ["subscription_id"],
    }),
  },
  {
    name: "stripe_list_charges",
    category: "external",
    executionMode: "in_process",
    description: "List recent Stripe charges with amounts, status, and customer info. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        limit: { type: "number", description: "Max charges to return (default: 20, max: 100)" },
      },
    }),
  },
  {
    name: "stripe_get_balance_transactions",
    category: "external",
    executionMode: "in_process",
    description: "List Stripe balance transactions (payments, refunds, fees). Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        limit: { type: "number", description: "Max transactions to return (default: 20, max: 100)" },
      },
    }),
  },
  {
    name: "stripe_list_products",
    category: "external",
    executionMode: "in_process",
    description: "List active Stripe products. Returns product names, descriptions, and IDs. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        limit: { type: "number", description: "Max products to return (default: 20, max: 100)" },
      },
    }),
  },
  {
    name: "stripe_list_prices",
    category: "external",
    executionMode: "in_process",
    description: "List active Stripe prices with amounts, currencies, and billing intervals. Requires STRIPE_SECRET_KEY in Settings → Skills.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        limit: { type: "number", description: "Max prices to return (default: 20, max: 100)" },
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
  // ── Channel messaging (Phase 2B) ──────────────────────────────────────
  {
    name: "channel_send_message",
    category: "external",
    executionMode: "approval_required",
    description: "Send a message to a contact via a connected channel (Slack, Email, WhatsApp, SMS). Always requires human approval. Configure channels in Settings → Channels.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        channel_type: { type: "string", enum: ["SLACK", "EMAIL", "WHATSAPP", "SMS"], description: "Channel to send through" },
        contact_id: { type: "string", description: "Recipient identifier (email, phone number, Slack user ID, etc.)" },
        content: { type: "string", description: "Message content" },
      },
      required: ["channel_type", "contact_id", "content"],
    }),
  },
  {
    name: "channel_reply",
    category: "external",
    executionMode: "approval_required",
    description: "Reply to an existing conversation via its channel. Always requires human approval. Use channel_list_conversations to find conversation IDs.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        conversation_id: { type: "string", description: "Conversation ID to reply to" },
        content: { type: "string", description: "Reply content" },
      },
      required: ["conversation_id", "content"],
    }),
  },
  {
    name: "channel_list_conversations",
    category: "read",
    executionMode: "in_process",
    description: "List active conversations across all connected channels. Shows latest message preview for each conversation.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        channel_type: { type: "string", enum: ["SLACK", "EMAIL", "WHATSAPP", "SMS"], description: "Optional: filter by channel type" },
        limit: { type: "number", description: "Max conversations to return (default: 10, max: 20)" },
      },
    }),
  },
  // ── Agent-to-agent communication (Phase 3B) ─────────────────────────
  {
    name: "send_agent_message",
    category: "orchestration",
    executionMode: "in_process",
    description: "Send a message to another agent in your task group. Use for coordination, requests, proposals, or sharing results between collaborating agents.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        task_group_id: { type: "string", description: "Task group ID for the collaboration" },
        to_agent: { type: "string", description: "Target agent kind (e.g. SALES_REP, FINANCE_ANALYST)" },
        content: { type: "string", description: "Message content" },
        message_type: { type: "string", enum: ["INFO", "REQUEST", "RESPONSE", "PROPOSAL", "COUNTER", "RESULT"], description: "Message type (default: INFO)" },
      },
      required: ["task_group_id", "to_agent", "content"],
    }),
  },
  {
    name: "read_agent_messages",
    category: "read",
    executionMode: "in_process",
    description: "Read recent messages from collaborating agents in a task group.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        task_group_id: { type: "string", description: "Task group ID" },
        limit: { type: "number", description: "Max messages to return (default: 10, max: 20)" },
      },
      required: ["task_group_id"],
    }),
  },
  {
    name: "write_workspace",
    category: "orchestration",
    executionMode: "in_process",
    description: "Write a key-value entry to the shared workspace in a task group. Other agents can read this data.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        task_group_id: { type: "string", description: "Task group ID" },
        key: { type: "string", description: "Workspace key (e.g. 'analysis_results', 'draft_email')" },
        value: { type: "string", description: "Value to store" },
      },
      required: ["task_group_id", "key", "value"],
    }),
  },
  {
    name: "read_workspace",
    category: "read",
    executionMode: "in_process",
    description: "Read from the shared workspace in a task group. Omit key to see all entries.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        task_group_id: { type: "string", description: "Task group ID" },
        key: { type: "string", description: "Optional: specific key to read. Omit to list all entries." },
      },
      required: ["task_group_id"],
    }),
  },
  {
    name: "request_agent_help",
    category: "orchestration",
    executionMode: "in_process",
    description: "Request help from another agent by creating a task group and delegating work. Creates a new task for the target agent with instructions and links both tasks in a shared group for communication.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        to_agent: { type: "string", description: "Target agent kind to request help from (e.g. RESEARCH_ANALYST, FINANCE_ANALYST)" },
        title: { type: "string", description: "Help request title (max 240 chars)" },
        instructions: { type: "string", description: "Detailed instructions for the helper agent" },
      },
      required: ["to_agent", "title", "instructions"],
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
  // ── Semantic file search (RAG) ────────────────────────────────────────
  {
    name: "semantic_search_files",
    category: "read",
    executionMode: "in_process",
    description: "Search business files using semantic similarity (RAG). Finds files most relevant to a natural-language query using vector embeddings (OpenAI text-embedding-3-small when available) or keyword fallback. Returns excerpts from the most relevant files. Use this instead of list_files when you need to find context about a specific topic, client, product, or project across all uploaded documents.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language query describing what you're looking for (e.g. 'Q3 revenue targets', 'churn risk customers', 'brand voice guidelines')" },
        limit: { type: "number", description: "Maximum number of results to return (default: 5, max: 10)" },
      },
      required: ["query"],
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
  // Entity ontology — cross-integration knowledge
  {
    name: "lookup_entity",
    category: "read",
    executionMode: "in_process",
    description: "Look up a unified entity across all connected integrations. Returns all known info, linked accounts, relationships, and recent activity. Use this when you need to understand who a person, company, deal, or project is across HubSpot, Google, Slack, Linear, etc.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        name_or_id: { type: "string", description: "Entity name, email, or ID to look up" },
        type: { type: "string", enum: ["PERSON", "COMPANY", "DEAL", "PROJECT"], description: "Optional entity type filter" },
      },
      required: ["name_or_id"],
    }),
  },
  {
    name: "search_entities",
    category: "read",
    executionMode: "in_process",
    description: "Search for entities by partial name, email, or domain. Returns matching entities across all types with their integration source counts.",
    parametersJson: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string", description: "Search term (partial name, email, or domain)" },
        type: { type: "string", enum: ["PERSON", "COMPANY", "DEAL", "PROJECT"], description: "Optional entity type filter" },
        limit: { type: "number", description: "Max results (default 20, max 50)" },
      },
      required: ["query"],
    }),
  },
];

const AGENT_TOOL_ASSIGNMENTS: Record<string, string[]> = {
  CHIEF_ADVISOR: [
    "read_file", "list_files", "search_business_logs", "get_project_details",
    "list_inbox_items", "web_fetch", "run_command", "write_file",
    "delegate_task", "send_email", "call_webhook", "create_business_log",
    "figma_get_design", "figma_get_image", "web_search", "extract_content",
    "schedule_followup", "sql_query", "generate_pdf", "agent_performance", "semantic_search_files",
    // HubSpot full
    "hubspot_search_contacts", "hubspot_create_contact", "hubspot_update_contact",
    "hubspot_list_deals", "hubspot_create_note",
    "hubspot_create_deal", "hubspot_update_deal", "hubspot_get_deal",
    "hubspot_list_pipeline_stages", "hubspot_create_company", "hubspot_search_companies",
    "hubspot_list_activities", "hubspot_create_engagement",
    "hubspot_list_contact_lists", "hubspot_get_custom_properties",
    // Slack full
    "slack_list_channels", "slack_post_message",
    "slack_add_reaction", "slack_reply_to_thread", "slack_create_channel",
    "slack_invite_to_channel", "slack_lookup_user", "slack_list_users",
    "slack_schedule_message", "slack_set_channel_topic",
    // Google full suite including Docs/Sheets write
    "google_list_emails", "google_read_email", "google_send_email", "google_list_calendar_events",
    "google_create_calendar_event", "google_list_drive_files", "google_read_drive_file",
    "google_create_doc", "google_append_doc", "google_create_sheet", "google_append_sheet_rows",
    // Linear full
    "linear_list_issues", "linear_create_issue", "linear_update_issue",
    "linear_list_projects", "linear_create_project", "linear_list_labels",
    "linear_create_comment", "linear_list_cycles", "linear_get_roadmap",
    "linear_update_project", "linear_get_issue_history",
    // Calendly all 4
    "calendly_list_event_types", "calendly_list_scheduled_events",
    "calendly_get_event_invitees", "calendly_create_scheduling_link",
    // GitHub full
    "github_list_repos", "github_list_issues", "github_create_issue", "github_list_prs",
    "github_create_pr", "github_merge_pr", "github_list_workflow_runs",
    "github_trigger_workflow", "github_add_label", "github_update_issue",
    "github_create_comment", "github_list_branches", "github_get_commit", "github_compare_commits",
    // Notion full
    "notion_search", "notion_read_page", "notion_create_page", "notion_append_block",
    "notion_query_database", "notion_create_database_entry",
    "notion_update_page", "notion_delete_page", "notion_list_databases",
    // Jira full
    "jira_list_projects", "jira_list_issues", "jira_get_issue",
    "jira_create_issue", "jira_update_issue", "jira_add_comment",
    "jira_transition_issue", "jira_list_transitions", "jira_assign_issue", "jira_search_users",
    // Stripe full
    "stripe_get_revenue", "stripe_list_customers", "stripe_list_subscriptions", "stripe_list_invoices",
    "stripe_get_customer", "stripe_create_customer", "stripe_get_invoice", "stripe_create_invoice",
    "stripe_get_subscription", "stripe_list_charges", "stripe_get_balance_transactions",
    "stripe_list_products", "stripe_list_prices",
    // Browser automation: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
    // Channel messaging (Phase 2B)
    "channel_send_message", "channel_reply", "channel_list_conversations",
    // Agent-to-agent communication (Phase 3B)
    "send_agent_message", "read_agent_messages", "write_workspace", "read_workspace", "request_agent_help",
    // Data Apps
    "generate_data_app",
    // Entity ontology
    "lookup_entity", "search_entities",
  ],
  MARKETING_COORDINATOR: [
    "search_business_logs", "list_files", "read_file", "web_fetch",
    "delegate_task", "create_business_log", "send_email", "list_inbox_items",
    "figma_get_design", "figma_get_image", "schedule_followup", "generate_pdf", "semantic_search_files",
    // Google full suite
    "google_list_emails", "google_read_email", "google_send_email", "google_list_calendar_events",
    "google_create_calendar_event", "google_list_drive_files", "google_read_drive_file",
    "google_create_doc", "google_append_doc", "google_create_sheet", "google_append_sheet_rows",
    // Slack expanded
    "slack_list_channels", "slack_post_message",
    "slack_add_reaction", "slack_reply_to_thread", "slack_lookup_user",
    "slack_list_users", "slack_schedule_message",
    // Notion expanded
    "notion_search", "notion_read_page", "notion_create_page", "notion_append_block",
    "notion_query_database", "notion_create_database_entry", "notion_list_databases",
    // GitHub read
    "github_list_repos", "github_list_issues", "github_list_prs",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
    // Channel messaging
    "channel_send_message", "channel_reply", "channel_list_conversations",
    // Agent-to-agent communication
    "send_agent_message", "read_agent_messages", "write_workspace", "read_workspace", "request_agent_help",
    // Entity ontology
    "lookup_entity", "search_entities",
  ],
  ASSISTANT: [
    "read_file", "list_files", "search_business_logs", "list_inbox_items",
    "web_fetch", "run_command", "write_file", "send_email", "call_webhook",
    "create_business_log", "delegate_task",
    // Slack basics
    "slack_list_channels", "slack_post_message", "slack_reply_to_thread",
    // Notion basics
    "notion_search", "notion_read_page",
    // Jira basics
    "jira_list_projects", "jira_list_issues", "jira_get_issue",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
    // Channel messaging
    "channel_send_message", "channel_reply", "channel_list_conversations",
    // Agent-to-agent communication
    "send_agent_message", "read_agent_messages", "write_workspace", "read_workspace", "request_agent_help",
    // Data Apps
    "generate_data_app",
    // Entity ontology
    "lookup_entity", "search_entities",
  ],
  SALES_REP: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "web_fetch", "send_email", "call_webhook", "delegate_task", "list_inbox_items",
    // HubSpot full
    "hubspot_search_contacts", "hubspot_create_contact", "hubspot_update_contact",
    "hubspot_list_deals", "hubspot_create_note",
    "hubspot_create_deal", "hubspot_update_deal", "hubspot_get_deal",
    "hubspot_list_pipeline_stages", "hubspot_create_company", "hubspot_search_companies",
    "hubspot_list_activities", "hubspot_create_engagement",
    "hubspot_list_contact_lists", "hubspot_get_custom_properties",
    // Slack expanded
    "slack_list_channels", "slack_post_message",
    "slack_add_reaction", "slack_reply_to_thread", "slack_lookup_user",
    // Linear list/update
    "linear_list_issues", "linear_update_issue",
    // Calendly
    "calendly_list_event_types", "calendly_list_scheduled_events",
    "calendly_create_scheduling_link",
    // Jira basics (for cross-team visibility)
    "jira_list_projects", "jira_list_issues", "jira_get_issue",
    // Stripe read-only
    "stripe_get_revenue", "stripe_list_customers", "stripe_get_customer",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
    // Channel messaging
    "channel_send_message", "channel_reply", "channel_list_conversations",
    // Agent-to-agent communication
    "send_agent_message", "read_agent_messages", "write_workspace", "read_workspace", "request_agent_help",
    // Entity ontology
    "lookup_entity", "search_entities",
  ],
  CUSTOMER_SUCCESS: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "send_email", "list_inbox_items", "delegate_task", "call_webhook",
    // HubSpot expanded
    "hubspot_search_contacts", "hubspot_update_contact", "hubspot_create_note",
    "hubspot_get_deal", "hubspot_list_activities", "hubspot_get_custom_properties",
    // Slack expanded
    "slack_list_channels", "slack_post_message",
    "slack_add_reaction", "slack_reply_to_thread", "slack_lookup_user",
    // Calendly
    "calendly_list_event_types", "calendly_list_scheduled_events",
    "calendly_get_event_invitees",
    // Jira read
    "jira_list_issues", "jira_get_issue",
    // Browser: navigate/content/screenshot only
    "browser_navigate", "browser_get_content", "browser_screenshot",
    // Channel messaging
    "channel_send_message", "channel_reply", "channel_list_conversations",
    // Agent-to-agent communication
    "send_agent_message", "read_agent_messages", "write_workspace", "read_workspace", "request_agent_help",
    // Entity ontology
    "lookup_entity", "search_entities",
  ],
  FINANCE_ANALYST: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "list_inbox_items", "get_project_details", "sql_query", "generate_pdf", "semantic_search_files",
    "google_list_drive_files", "google_read_drive_file",
    "google_create_doc", "google_append_doc", "google_create_sheet", "google_append_sheet_rows",
    // QuickBooks
    "quickbooks_get_profit_loss", "quickbooks_get_balance_sheet",
    "quickbooks_get_cash_flow", "quickbooks_list_invoices",
    // Xero
    "xero_get_profit_loss", "xero_get_balance_sheet",
    "xero_get_trial_balance", "xero_list_invoices",
    // Stripe full
    "stripe_get_revenue", "stripe_list_customers", "stripe_list_subscriptions", "stripe_list_invoices",
    "stripe_get_customer", "stripe_create_customer", "stripe_get_invoice", "stripe_create_invoice",
    "stripe_get_subscription", "stripe_list_charges", "stripe_get_balance_transactions",
    "stripe_list_products", "stripe_list_prices",
    // Agent-to-agent communication
    "send_agent_message", "read_agent_messages", "write_workspace", "read_workspace", "request_agent_help",
    // Data Apps
    "generate_data_app",
    // Entity ontology
    "lookup_entity", "search_entities",
  ],
  OPERATIONS_MANAGER: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "web_fetch", "send_email", "call_webhook", "delegate_task", "list_inbox_items",
    "schedule_followup", "sql_query", "generate_pdf", "agent_performance",
    // Linear full
    "linear_list_issues", "linear_create_issue", "linear_update_issue",
    "linear_list_projects", "linear_create_project", "linear_list_labels",
    "linear_create_comment", "linear_list_cycles", "linear_get_roadmap",
    "linear_update_project", "linear_get_issue_history",
    // Slack expanded
    "slack_list_channels", "slack_post_message",
    "slack_add_reaction", "slack_reply_to_thread", "slack_create_channel",
    "slack_invite_to_channel", "slack_list_users", "slack_set_channel_topic",
    // GitHub full
    "github_list_repos", "github_list_issues", "github_create_issue", "github_list_prs",
    "github_create_pr", "github_merge_pr", "github_list_workflow_runs",
    "github_trigger_workflow", "github_add_label", "github_update_issue",
    "github_create_comment", "github_list_branches", "github_get_commit", "github_compare_commits",
    // Notion expanded
    "notion_search", "notion_read_page", "notion_create_page", "notion_append_block",
    "notion_query_database", "notion_create_database_entry",
    "notion_update_page", "notion_delete_page", "notion_list_databases",
    // Jira full
    "jira_list_projects", "jira_list_issues", "jira_get_issue",
    "jira_create_issue", "jira_update_issue", "jira_add_comment",
    "jira_transition_issue", "jira_list_transitions", "jira_assign_issue", "jira_search_users",
    // Google Docs
    "google_create_doc", "google_append_doc", "google_create_sheet", "google_append_sheet_rows",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
    // Channel messaging
    "channel_send_message", "channel_reply", "channel_list_conversations",
    // Agent-to-agent communication
    "send_agent_message", "read_agent_messages", "write_workspace", "read_workspace", "request_agent_help",
    // Data Apps
    "generate_data_app",
    // Entity ontology
    "lookup_entity", "search_entities",
  ],
  EXECUTIVE_ASSISTANT: [
    "search_business_logs", "create_business_log", "list_files", "read_file",
    "list_inbox_items", "send_email", "get_project_details", "schedule_followup", "generate_pdf", "agent_performance",
    // Google Gmail + Calendar + Docs
    "google_list_emails", "google_read_email", "google_send_email",
    "google_list_calendar_events", "google_create_calendar_event",
    "google_list_drive_files", "google_read_drive_file",
    "google_create_doc", "google_append_doc",
    // Slack expanded
    "slack_list_channels", "slack_post_message",
    "slack_reply_to_thread", "slack_lookup_user", "slack_list_users", "slack_schedule_message",
    // Notion expanded
    "notion_search", "notion_read_page", "notion_create_page", "notion_append_block",
    "notion_query_database", "notion_list_databases",
    // Calendly all 4
    "calendly_list_event_types", "calendly_list_scheduled_events",
    "calendly_get_event_invitees", "calendly_create_scheduling_link",
    // Jira read
    "jira_list_projects", "jira_list_issues", "jira_get_issue",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
    // Channel messaging
    "channel_send_message", "channel_reply", "channel_list_conversations",
    // Agent-to-agent communication
    "send_agent_message", "read_agent_messages", "write_workspace", "read_workspace", "request_agent_help",
    // Entity ontology
    "lookup_entity", "search_entities",
  ],
  RESEARCH_ANALYST: [
    "web_search", "extract_content", "quality_review",
    "search_business_logs", "create_business_log",
    "list_files", "read_file", "delegate_task", "list_inbox_items",
    "sql_query", "generate_pdf", "semantic_search_files",
    // Notion expanded
    "notion_search", "notion_read_page", "notion_create_page",
    "notion_query_database", "notion_list_databases",
    // Google Drive + Docs
    "google_list_drive_files", "google_read_drive_file",
    "google_create_doc", "google_append_doc",
    // GitHub read-only
    "github_list_repos", "github_list_issues", "github_list_prs",
    "github_list_branches", "github_get_commit", "github_compare_commits",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
    // Agent-to-agent communication
    "send_agent_message", "read_agent_messages", "write_workspace", "read_workspace", "request_agent_help",
    // Data Apps
    "generate_data_app",
    // Entity ontology
    "lookup_entity", "search_entities",
  ],
  SEO_SPECIALIST: [
    "web_search", "extract_content", "web_fetch", "quality_review",
    "search_business_logs", "create_business_log",
    "list_files", "read_file", "delegate_task", "list_inbox_items",
    // Notion read
    "notion_search", "notion_read_page", "notion_query_database",
    // Browser: all 5
    "browser_navigate", "browser_get_content", "browser_screenshot", "browser_click", "browser_type",
    // Agent-to-agent communication (read-only)
    "read_agent_messages", "read_workspace",
    // Entity ontology
    "lookup_entity", "search_entities",
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
