import { prisma } from "@/lib/db";

export type ToolDefinitionView = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  executionMode: "in_process" | "runner" | "approval_required";
  category: string;
};

export type LlmToolSpec = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

let _seedAttempted = false;

async function ensureToolsSeeded(): Promise<boolean> {
  if (_seedAttempted) return true;
  _seedAttempted = true;
  try {
    const { seedToolDefinitions } = await import("@/lib/tool-definitions-seed");
    await seedToolDefinitions();
    return true;
  } catch {
    // Table may not exist yet (migration not applied) — gracefully degrade
    return false;
  }
}

export async function getToolsForAgentKind(
  agentKind: string,
  userAllowlist?: string[] | null,
): Promise<ToolDefinitionView[]> {
  try {
    await ensureToolsSeeded();

    const rows = await prisma.agentKindToolSet.findMany({
      where: { agentKind, enabled: true },
      include: {
        toolDefinition: true,
      },
    });

    const allowedToolNames = userAllowlist?.length
      ? new Set(
          userAllowlist.flatMap((key) => {
            const mapped = INTEGRATION_TO_TOOL_MAPPING[key.toLowerCase().trim()];
            return mapped ?? [key.toLowerCase().trim()];
          }),
        )
      : null;

    const tools: ToolDefinitionView[] = [];
    for (const row of rows) {
      const def = row.toolDefinition;
      if (!def.enabled) continue;

      if (allowedToolNames && !allowedToolNames.has(def.name)) continue;

      let parameters: Record<string, unknown>;
      try {
        parameters = JSON.parse(def.parametersJson) as Record<string, unknown>;
      } catch {
        parameters = { type: "object", properties: {} };
      }

      tools.push({
        name: def.name,
        description: def.description,
        parameters,
        executionMode: def.executionMode as ToolDefinitionView["executionMode"],
        category: def.category,
      });
    }

    return tools;
  } catch {
    // If the ToolDefinition/AgentKindToolSet tables don't exist yet,
    // return empty so the heuristic fallback loop runs instead.
    return [];
  }
}

export function toolDefsToLlmSpecs(tools: ToolDefinitionView[]): LlmToolSpec[] {
  return tools.map((t) => ({
    type: "function" as const,
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

const INTEGRATION_TO_TOOL_MAPPING: Record<string, string[]> = {
  files: ["read_file", "list_files"],
  business_files: ["read_file", "list_files"],
  file_store: ["read_file", "list_files"],
  storage: ["read_file", "list_files"],
  drive: [
    "google_list_drive_files", "google_read_drive_file",
    "read_file", "list_files",
  ],
  business_logs: ["search_business_logs", "create_business_log"],
  logs: ["search_business_logs", "create_business_log"],
  businesslog: ["search_business_logs", "create_business_log"],
  businesslogs: ["search_business_logs", "create_business_log"],
  email: ["send_email", "google_list_emails", "google_send_email"],
  crm: [
    "hubspot_search_contacts", "hubspot_create_contact", "hubspot_update_contact",
    "hubspot_list_deals", "hubspot_create_note",
  ],
  hubspot: [
    "hubspot_search_contacts", "hubspot_create_contact", "hubspot_update_contact",
    "hubspot_list_deals", "hubspot_create_note",
  ],
  slack: ["slack_list_channels", "slack_post_message"],
  google: [
    "google_list_emails", "google_send_email",
    "google_list_calendar_events", "google_create_calendar_event",
    "google_list_drive_files", "google_read_drive_file",
  ],
  linear: ["linear_list_issues", "linear_create_issue", "linear_update_issue"],
  calendar: [
    "google_list_calendar_events", "google_create_calendar_event",
    "calendly_list_scheduled_events", "calendly_list_event_types",
  ],
  calendly: [
    "calendly_list_event_types", "calendly_list_scheduled_events",
    "calendly_get_event_invitees", "calendly_create_scheduling_link",
  ],
  scheduling: [
    "calendly_list_event_types", "calendly_list_scheduled_events",
    "calendly_get_event_invitees", "calendly_create_scheduling_link",
  ],
  booking: [
    "calendly_list_event_types", "calendly_list_scheduled_events",
    "calendly_create_scheduling_link",
  ],
  browser: ["web_fetch"],
  web: ["web_fetch"],
  web_fetch: ["web_fetch"],
  http: ["web_fetch"],
  review_queue: ["list_inbox_items"],
  inbox: ["list_inbox_items"],
  reviews: ["list_inbox_items"],
  projects: ["get_project_details"],
  sheets: ["google_list_drive_files", "google_read_drive_file", "read_file", "list_files"],
  docs: ["google_list_drive_files", "google_read_drive_file", "read_file", "list_files"],
  excel: ["read_file", "list_files"],
  word: ["read_file", "list_files"],
  quickbooks: [
    "quickbooks_get_profit_loss", "quickbooks_get_balance_sheet",
    "quickbooks_get_cash_flow", "quickbooks_list_invoices",
  ],
  xero: [
    "xero_get_profit_loss", "xero_get_balance_sheet",
    "xero_get_trial_balance", "xero_list_invoices",
  ],
  accounting: [
    "quickbooks_get_profit_loss", "quickbooks_get_balance_sheet",
    "quickbooks_get_cash_flow", "quickbooks_list_invoices",
    "xero_get_profit_loss", "xero_get_balance_sheet",
    "xero_get_trial_balance", "xero_list_invoices",
  ],
  finance: [
    "quickbooks_get_profit_loss", "quickbooks_get_balance_sheet",
    "quickbooks_get_cash_flow", "quickbooks_list_invoices",
    "xero_get_profit_loss", "xero_get_balance_sheet",
    "xero_get_trial_balance", "xero_list_invoices",
    "stripe_get_revenue", "stripe_list_customers",
    "stripe_list_subscriptions", "stripe_list_invoices",
  ],
  stripe: [
    "stripe_get_revenue", "stripe_list_customers",
    "stripe_list_subscriptions", "stripe_list_invoices",
  ],
  revenue: [
    "stripe_get_revenue", "stripe_list_customers",
    "stripe_list_subscriptions", "stripe_list_invoices",
  ],
  github: [
    "github_list_repos", "github_list_issues",
    "github_create_issue", "github_list_prs",
  ],
  notion: [
    "notion_search", "notion_read_page",
    "notion_create_page", "notion_append_block",
  ],
  wiki: ["notion_search", "notion_read_page"],
  knowledge: ["notion_search", "notion_read_page"],
  google_docs: [
    "google_create_doc", "google_append_doc",
    "google_create_sheet", "google_append_sheet_rows",
    "google_list_drive_files", "google_read_drive_file",
  ],
  sql: ["sql_query"],
  database: ["sql_query"],
  schedule: ["schedule_followup"],
  followup: ["schedule_followup"],
};

export function getIntegrationToToolMapping(): Record<string, string[]> {
  return { ...INTEGRATION_TO_TOOL_MAPPING };
}
