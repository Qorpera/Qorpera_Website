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
  drive: ["read_file", "list_files"],
  business_logs: ["search_business_logs", "create_business_log"],
  logs: ["search_business_logs", "create_business_log"],
  businesslog: ["search_business_logs", "create_business_log"],
  businesslogs: ["search_business_logs", "create_business_log"],
  email: ["send_email"],
  crm: [],
  browser: ["web_fetch"],
  web: ["web_fetch"],
  web_fetch: ["web_fetch"],
  http: ["web_fetch"],
  review_queue: ["list_inbox_items"],
  inbox: ["list_inbox_items"],
  reviews: ["list_inbox_items"],
  projects: ["get_project_details"],
  sheets: ["read_file", "list_files"],
  docs: ["read_file", "list_files"],
  excel: ["read_file", "list_files"],
  word: ["read_file", "list_files"],
};

export function getIntegrationToToolMapping(): Record<string, string[]> {
  return { ...INTEGRATION_TO_TOOL_MAPPING };
}
