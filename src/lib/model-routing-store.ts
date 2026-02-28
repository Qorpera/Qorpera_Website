import { ModelProvider } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ModelRouteTarget = "ADVISOR" | "ASSISTANT";
export type ModelRouteProvider = "OPENAI" | "ANTHROPIC" | "GOOGLE";

export type ModelRoute = {
  target: ModelRouteTarget;
  provider: ModelRouteProvider;
  modelName: string;
  updatedAt: string | null;
};

const TARGETS: ModelRouteTarget[] = ["ADVISOR", "ASSISTANT"];

const DEFAULTS: Record<ModelRouteTarget, ModelRoute> = {
  ADVISOR: {
    target: "ADVISOR",
    provider: "OPENAI",
    modelName: process.env.OPENAI_ADVISOR_MODEL ?? "gpt-4.1-mini",
    updatedAt: null,
  },
  ASSISTANT: {
    target: "ASSISTANT",
    provider: "OPENAI",
    modelName: "gpt-4.1-mini",
    updatedAt: null,
  },
};

function fromDb(row: { target: string; provider: ModelProvider; modelName: string; updatedAt: Date }): ModelRoute {
  return {
    target: row.target as ModelRouteTarget,
    provider: row.provider as ModelRouteProvider,
    modelName: row.modelName,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getModelRoute(userId: string, target: ModelRouteTarget): Promise<ModelRoute> {
  const row = await prisma.modelRoutePreference.findUnique({ where: { userId_target: { userId, target } } });
  return row ? fromDb(row) : DEFAULTS[target];
}

export async function getModelRoutes(userId: string): Promise<Record<ModelRouteTarget, ModelRoute>> {
  const rows = await prisma.modelRoutePreference.findMany({ where: { userId, target: { in: TARGETS } } });
  const byTarget = new Map(rows.map((r) => [r.target, fromDb(r)]));
  return {
    ADVISOR: (byTarget.get("ADVISOR") as ModelRoute | undefined) ?? DEFAULTS.ADVISOR,
    ASSISTANT: (byTarget.get("ASSISTANT") as ModelRoute | undefined) ?? DEFAULTS.ASSISTANT,
  };
}

export async function setModelRoute(
  userId: string,
  target: ModelRouteTarget,
  provider: ModelRouteProvider,
  modelName: string,
): Promise<ModelRoute> {
  const cleanModel = modelName.trim().slice(0, 120) || DEFAULTS[target].modelName;
  const row = await prisma.modelRoutePreference.upsert({
    where: { userId_target: { userId, target } },
    update: { provider: provider as ModelProvider, modelName: cleanModel },
    create: { userId, target, provider: provider as ModelProvider, modelName: cleanModel },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "MODEL_ROUTE",
      entityId: row.id,
      action: "SET",
      summary: `Set ${target} model route to ${provider}:${cleanModel}`,
    },
  });

  return fromDb(row);
}

export type AgentKindRouteKey =
  | "CHIEF_ADVISOR"
  | "ASSISTANT"
  | "SALES_REP"
  | "CUSTOMER_SUCCESS"
  | "MARKETING_COORDINATOR"
  | "FINANCE_ANALYST"
  | "OPERATIONS_MANAGER"
  | "EXECUTIVE_ASSISTANT"
  | "RESEARCH_ANALYST"
  | "SEO_SPECIALIST";

const AGENT_KIND_TO_TARGET: Record<AgentKindRouteKey, ModelRouteTarget> = {
  CHIEF_ADVISOR: "ADVISOR",
  ASSISTANT: "ASSISTANT",
  SALES_REP: "ASSISTANT",
  CUSTOMER_SUCCESS: "ASSISTANT",
  MARKETING_COORDINATOR: "ASSISTANT",
  FINANCE_ANALYST: "ASSISTANT",
  OPERATIONS_MANAGER: "ASSISTANT",
  EXECUTIVE_ASSISTANT: "ASSISTANT",
  RESEARCH_ANALYST: "ASSISTANT",
  SEO_SPECIALIST: "ASSISTANT",
};

export async function getModelRouteForAgentKind(
  userId: string,
  agentKind: AgentKindRouteKey,
): Promise<ModelRoute> {
  const target = AGENT_KIND_TO_TARGET[agentKind] ?? "ADVISOR";
  return getModelRoute(userId, target);
}

export function getAvailableModelCatalog() {
  return {
    OPENAI: ["gpt-4.1-mini", "gpt-4.1", "gpt-5.2"],
    ANTHROPIC: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"],
    GOOGLE: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"],
  } satisfies Record<ModelRouteProvider, string[]>;
}
