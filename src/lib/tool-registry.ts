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
    "hubspot_create_deal", "hubspot_update_deal", "hubspot_get_deal",
    "hubspot_list_pipeline_stages", "hubspot_create_company", "hubspot_search_companies",
    "hubspot_list_activities", "hubspot_create_engagement",
    "hubspot_list_contact_lists", "hubspot_get_custom_properties",
  ],
  hubspot: [
    "hubspot_search_contacts", "hubspot_create_contact", "hubspot_update_contact",
    "hubspot_list_deals", "hubspot_create_note",
    "hubspot_create_deal", "hubspot_update_deal", "hubspot_get_deal",
    "hubspot_list_pipeline_stages", "hubspot_create_company", "hubspot_search_companies",
    "hubspot_list_activities", "hubspot_create_engagement",
    "hubspot_list_contact_lists", "hubspot_get_custom_properties",
  ],
  slack: [
    "slack_list_channels", "slack_post_message",
    "slack_add_reaction", "slack_reply_to_thread", "slack_create_channel",
    "slack_invite_to_channel", "slack_lookup_user", "slack_list_users",
    "slack_schedule_message", "slack_set_channel_topic",
  ],
  google: [
    "google_list_emails", "google_send_email",
    "google_list_calendar_events", "google_create_calendar_event",
    "google_list_drive_files", "google_read_drive_file",
  ],
  linear: [
    "linear_list_issues", "linear_create_issue", "linear_update_issue",
    "linear_list_projects", "linear_create_project", "linear_list_labels",
    "linear_create_comment", "linear_list_cycles", "linear_get_roadmap",
    "linear_update_project", "linear_get_issue_history",
  ],
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
    "stripe_get_customer", "stripe_create_customer",
    "stripe_get_invoice", "stripe_create_invoice",
    "stripe_get_subscription", "stripe_list_charges",
    "stripe_get_balance_transactions", "stripe_list_products", "stripe_list_prices",
  ],
  stripe: [
    "stripe_get_revenue", "stripe_list_customers",
    "stripe_list_subscriptions", "stripe_list_invoices",
    "stripe_get_customer", "stripe_create_customer",
    "stripe_get_invoice", "stripe_create_invoice",
    "stripe_get_subscription", "stripe_list_charges",
    "stripe_get_balance_transactions", "stripe_list_products", "stripe_list_prices",
  ],
  revenue: [
    "stripe_get_revenue", "stripe_list_customers",
    "stripe_list_subscriptions", "stripe_list_invoices",
    "stripe_get_customer", "stripe_create_customer",
    "stripe_get_invoice", "stripe_create_invoice",
    "stripe_get_subscription", "stripe_list_charges",
    "stripe_get_balance_transactions", "stripe_list_products", "stripe_list_prices",
  ],
  jira: [
    "jira_list_projects", "jira_list_issues", "jira_get_issue",
    "jira_create_issue", "jira_update_issue", "jira_add_comment",
    "jira_transition_issue", "jira_list_transitions",
    "jira_assign_issue", "jira_search_users",
  ],
  atlassian: [
    "jira_list_projects", "jira_list_issues", "jira_get_issue",
    "jira_create_issue", "jira_update_issue", "jira_add_comment",
    "jira_transition_issue", "jira_list_transitions",
    "jira_assign_issue", "jira_search_users",
  ],
  github: [
    "github_list_repos", "github_list_issues",
    "github_create_issue", "github_list_prs",
    "github_create_pr", "github_merge_pr", "github_list_workflow_runs",
    "github_trigger_workflow", "github_add_label", "github_update_issue",
    "github_create_comment", "github_list_branches", "github_get_commit",
    "github_compare_commits",
  ],
  notion: [
    "notion_search", "notion_read_page",
    "notion_create_page", "notion_append_block",
    "notion_query_database", "notion_create_database_entry",
    "notion_update_page", "notion_delete_page", "notion_list_databases",
  ],
  wiki: ["notion_search", "notion_read_page", "notion_query_database", "notion_list_databases"],
  knowledge: ["notion_search", "notion_read_page", "notion_query_database", "notion_list_databases"],
  google_docs: [
    "google_create_doc", "google_append_doc",
    "google_create_sheet", "google_append_sheet_rows",
    "google_list_drive_files", "google_read_drive_file",
  ],
  sql: ["sql_query"],
  database: ["sql_query"],
  schedule: ["schedule_followup"],
  followup: ["schedule_followup"],
  // Channel messaging
  channels: ["channel_send_message", "channel_reply", "channel_list_conversations"],
  messaging: ["channel_send_message", "channel_reply", "channel_list_conversations", "slack_post_message", "send_email"],
  sms: ["channel_send_message", "channel_reply"],
  whatsapp: ["channel_send_message", "channel_reply"],
  // Agent-to-agent communication
  agent_communication: ["send_agent_message", "read_agent_messages", "write_workspace", "read_workspace", "request_agent_help"],
  collaboration: ["send_agent_message", "read_agent_messages", "write_workspace", "read_workspace", "request_agent_help"],
  workspace: ["write_workspace", "read_workspace"],
};

export function getIntegrationToToolMapping(): Record<string, string[]> {
  return { ...INTEGRATION_TO_TOOL_MAPPING };
}
