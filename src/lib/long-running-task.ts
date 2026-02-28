/**
 * Long-running task engine.
 * Breaks large tasks into phases, executes them with checkpoints between each phase,
 * and supports resuming from a checkpoint.
 */

import { prisma } from "@/lib/db";
import { saveCheckpoint, getLatestCheckpoint, type CheckpointData } from "@/lib/checkpoint-store";
import { callAgentLlm } from "@/lib/agent-llm";
import type { AgentKindRouteKey } from "@/lib/model-routing-store";

export type TaskPhase = {
  index: number;
  name: string;
  instructions: string;
};

/**
 * Use LLM to break a task's instructions into sequential phases.
 */
export async function planTaskPhases(
  userId: string,
  agentKind: string,
  taskTitle: string,
  taskInstructions: string,
): Promise<TaskPhase[]> {
  const prompt = [
    "You are a task planning assistant. Break the following task into 2-8 sequential phases.",
    "Each phase should be independently executable and produce a clear output.",
    "Return a JSON array of objects with: index (0-based), name (short label), instructions (detailed instructions for that phase).",
    "Return ONLY the JSON array, no other text.",
    "",
    `Task: ${taskTitle}`,
    `Instructions: ${taskInstructions.slice(0, 6000)}`,
  ].join("\n");

  const result = await callAgentLlm({
    userId,
    agentKind: agentKind as AgentKindRouteKey,
    systemPrompt: "You break tasks into sequential phases. Return only JSON.",
    userMessage: prompt,
  });

  if (result.error || !result.text) {
    return [{ index: 0, name: "Execute", instructions: taskInstructions }];
  }

  try {
    // Extract JSON from response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");
    const phases = JSON.parse(jsonMatch[0]) as Array<{ index: number; name: string; instructions: string }>;
    if (!Array.isArray(phases) || phases.length === 0) throw new Error("Empty phases");
    return phases.slice(0, 8).map((p, i) => ({
      index: i,
      name: String(p.name ?? `Phase ${i + 1}`).slice(0, 120),
      instructions: String(p.instructions ?? taskInstructions).slice(0, 8000),
    }));
  } catch {
    return [{ index: 0, name: "Execute", instructions: taskInstructions }];
  }
}

export type LongRunningTaskResult = {
  finalOutput: string;
  phasesCompleted: number;
  totalPhases: number;
  totalTurns: number;
  totalToolCalls: number;
  terminationReason: "completed" | "checkpoint_saved" | "error" | "max_runtime";
};

/**
 * Execute a long-running task phase by phase.
 * Saves checkpoints between phases. Can be resumed from last checkpoint.
 */
export async function executeLongRunningTask(input: {
  userId: string;
  delegatedTaskId: string;
  agentKind: string;
  systemPrompt: string;
  taskTitle: string;
  taskInstructions: string;
  tools: import("@/lib/tool-registry").ToolDefinitionView[];
  config: {
    maxTurns: number;
    maxRuntimeMs: number;
    maxParallelCalls: number;
    maxToolRetries: number;
    requireApproval: boolean;
    maxOutputTokens?: number;
  };
  onEvent?: (event: import("@/lib/agentic-loop").AgenticStreamEvent) => void;
}): Promise<LongRunningTaskResult> {
  const { userId, delegatedTaskId, agentKind, systemPrompt, taskTitle, taskInstructions, tools, config, onEvent } = input;
  const startedAt = Date.now();

  // Plan phases
  const phases = await planTaskPhases(userId, agentKind, taskTitle, taskInstructions);

  await prisma.delegatedTask.update({
    where: { id: delegatedTaskId },
    data: { totalPhases: phases.length },
  });

  // Check for existing checkpoint to resume from
  const existingCheckpoint = await getLatestCheckpoint(delegatedTaskId);
  const startPhase = existingCheckpoint ? existingCheckpoint.phaseIndex + 1 : 0;

  let cumulativeOutput = existingCheckpoint?.intermediateOutput ?? "";
  let totalTurns = existingCheckpoint?.turnsCompleted ?? 0;
  let totalToolCalls = existingCheckpoint?.totalToolCalls ?? 0;

  const { runAgenticLoop } = await import("@/lib/agentic-loop");

  for (let i = startPhase; i < phases.length; i++) {
    const phase = phases[i];

    // Check runtime budget
    if (Date.now() - startedAt > config.maxRuntimeMs) {
      await saveCheckpoint(delegatedTaskId, {
        phaseIndex: i - 1,
        phaseName: phases[Math.max(0, i - 1)].name,
        intermediateOutput: cumulativeOutput,
        turnsCompleted: totalTurns,
        totalToolCalls,
      });
      return {
        finalOutput: cumulativeOutput,
        phasesCompleted: i,
        totalPhases: phases.length,
        totalTurns,
        totalToolCalls,
        terminationReason: "max_runtime",
      };
    }

    // Update progress
    await prisma.delegatedTask.update({
      where: { id: delegatedTaskId },
      data: {
        currentPhase: i,
        progressPct: Math.round((i / phases.length) * 100),
      },
    });

    const phasePrompt = [
      systemPrompt,
      "",
      `## Current Task Phase (${i + 1}/${phases.length}): ${phase.name}`,
      phase.instructions,
      "",
      cumulativeOutput ? `## Output from previous phases:\n${cumulativeOutput.slice(0, 8000)}` : "",
    ].join("\n");

    const phaseResult = await runAgenticLoop({
      userId,
      delegatedTaskId,
      agentKind,
      systemPrompt: phasePrompt,
      userMessage: `Execute phase ${i + 1}: ${phase.name}\n\n${phase.instructions}`,
      tools,
      config: {
        ...config,
        maxRuntimeMs: Math.max(30000, config.maxRuntimeMs - (Date.now() - startedAt)),
      },
      onEvent,
    });

    totalTurns += phaseResult.turns;
    totalToolCalls += phaseResult.totalToolCalls;
    cumulativeOutput += `\n\n## Phase ${i + 1}: ${phase.name}\n${phaseResult.finalText}`;

    // Save checkpoint after each phase
    await saveCheckpoint(delegatedTaskId, {
      phaseIndex: i,
      phaseName: phase.name,
      intermediateOutput: cumulativeOutput,
      turnsCompleted: totalTurns,
      totalToolCalls,
    });

    if (phaseResult.terminationReason === "error") {
      return {
        finalOutput: cumulativeOutput,
        phasesCompleted: i + 1,
        totalPhases: phases.length,
        totalTurns,
        totalToolCalls,
        terminationReason: "error",
      };
    }
  }

  // All phases complete
  await prisma.delegatedTask.update({
    where: { id: delegatedTaskId },
    data: { progressPct: 100, currentPhase: phases.length },
  });

  return {
    finalOutput: cumulativeOutput,
    phasesCompleted: phases.length,
    totalPhases: phases.length,
    totalTurns,
    totalToolCalls,
    terminationReason: "completed",
  };
}

/**
 * Resume a long-running task from its last checkpoint.
 */
export async function resumeFromCheckpoint(
  delegatedTaskId: string,
): Promise<CheckpointData | null> {
  return getLatestCheckpoint(delegatedTaskId);
}
