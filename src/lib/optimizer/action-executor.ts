/**
 * Executes optimizer actions against the database.
 * Called only for HIGH priority actions (auto-apply).
 * MEDIUM/LOW actions are logged only.
 */

import { prisma } from "@/lib/db";
import type {
  OptimizationAction,
  PromptPatchAction,
  SoulAdditionAction,
  AutomationConfigAction,
  MemorySeedAction,
} from "./types";
import { applyImprovement } from "./optimizer-store";

export type ActionResult = {
  actionId: string;
  type: OptimizationAction["type"];
  applied: boolean;
  error?: string;
};

export async function executeAction(
  userId: string,
  cycleId: string,
  agentKind: string,
  action: OptimizationAction,
): Promise<ActionResult> {
  try {
    switch (action.type) {
      case "prompt_patch":
        await applyPromptPatch(userId, cycleId, agentKind, action);
        break;
      case "soul_addition":
        await applySoulAddition(userId, agentKind, action);
        break;
      case "automation_config":
        await applyAutomationConfig(userId, agentKind, action);
        break;
      case "memory_seed":
        await applyMemorySeed(userId, agentKind, action);
        break;
    }
    return { actionId: action.id, type: action.type, applied: true };
  } catch (e) {
    return {
      actionId: action.id,
      type: action.type,
      applied: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

async function applyPromptPatch(
  userId: string,
  cycleId: string,
  agentKind: string,
  action: PromptPatchAction,
) {
  const patchText = `${action.sectionHeader}\n${action.content}`;
  await applyImprovement(userId, cycleId, agentKind, {
    id: action.id,
    dimension: action.dimension,
    priority: action.priority,
    issue: action.issue,
    recommendation: action.sectionHeader,
    researchBasis: action.researchBasis,
    promptPatch: patchText,
  });
}

async function applySoulAddition(
  userId: string,
  agentKind: string,
  action: SoulAdditionAction,
) {
  // Upsert the AgentMemory record for this agent
  const memory = await prisma.agentMemory.upsert({
    where: { userId_agentKind: { userId, agentKind } },
    update: {},
    create: { userId, agentKind, indexContent: "", entryCount: 0 },
  });

  // Add the truth/boundary as a max-importance memory entry
  const topic =
    action.field === "coreTruth" ? "optimizer_core_truth" : "optimizer_boundary";

  await prisma.agentMemoryEntry.create({
    data: {
      agentMemoryId: memory.id,
      topic,
      title: action.field === "coreTruth" ? "Core Truth (Optimizer)" : "Boundary (Optimizer)",
      content: action.content,
      importance: 10,
    },
  });

  // Increment entry count
  await prisma.agentMemory.update({
    where: { id: memory.id },
    data: { entryCount: { increment: 1 } },
  });
}

async function applyAutomationConfig(
  userId: string,
  agentKind: string,
  action: AutomationConfigAction,
) {
  // Direct prisma update mirroring the upsertAgentAutomationConfig pattern
  // but scoped to just this one field to avoid clobbering other settings
  const existing = await prisma.agentAutomationConfig.findUnique({
    where: { userId_agentTarget: { userId, agentTarget: agentKind } },
  });

  const numericFields = new Set([
    "maxLoopIterations",
    "maxRuntimeSeconds",
    "maxAgentCallsPerRun",
    "maxToolRetries",
  ]);
  const clampedValue = numericFields.has(action.field)
    ? clampConfigField(action.field, Number(action.recommendedValue))
    : action.recommendedValue;

  if (existing) {
    await prisma.agentAutomationConfig.update({
      where: { id: existing.id },
      data: { [action.field]: clampedValue },
    });
  } else {
    // Create with this field set; all others get DB defaults
    await prisma.agentAutomationConfig.create({
      data: {
        userId,
        agentTarget: agentKind,
        [action.field]: clampedValue,
      },
    });
  }
}

function clampConfigField(field: string, value: number): number {
  switch (field) {
    case "maxLoopIterations":    return Math.max(1,  Math.min(20,   value));
    case "maxRuntimeSeconds":    return Math.max(15, Math.min(1800, value));
    case "maxAgentCallsPerRun":  return Math.max(1,  Math.min(30,   value));
    case "maxToolRetries":       return Math.max(0,  Math.min(5,    value));
    default:                     return value;
  }
}

async function applyMemorySeed(
  userId: string,
  agentKind: string,
  action: MemorySeedAction,
) {
  const memory = await prisma.agentMemory.upsert({
    where: { userId_agentKind: { userId, agentKind } },
    update: {},
    create: { userId, agentKind, indexContent: "", entryCount: 0 },
  });

  await prisma.agentMemoryEntry.create({
    data: {
      agentMemoryId: memory.id,
      topic: action.topic,
      title: action.title,
      content: action.content.slice(0, 4000),
      importance: Math.max(1, Math.min(10, Math.round(action.importance))),
    },
  });

  await prisma.agentMemory.update({
    where: { id: memory.id },
    data: { entryCount: { increment: 1 } },
  });
}
