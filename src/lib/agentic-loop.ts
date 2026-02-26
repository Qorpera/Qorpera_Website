import { callAgentLlmWithTools, type ConversationMessage } from "@/lib/agent-llm";
import type { AgentKindRouteKey } from "@/lib/model-routing-store";
import { toolDefsToLlmSpecs, type ToolDefinitionView } from "@/lib/tool-registry";
import { executeToolCallsParallel } from "@/lib/tool-executor";
import { prisma } from "@/lib/db";
import type { AdapterTraceRow } from "@/lib/integration-adapters";

export type AgenticStreamEvent =
  | { type: "llm_call"; turn: number }
  | { type: "llm_result"; turn: number; provider: string; model: string; toolNames: string[] }
  | { type: "tool_call"; turn: number; toolName: string; argsSummary: string }
  | { type: "tool_result"; turn: number; toolName: string; status: string; summary: string; latencyMs: number }
  | { type: "final_answer"; text: string; turns: number; totalToolCalls: number; terminationReason: string }
  | { type: "task_done"; status: string }
  | { type: "error"; message: string };

export type AgenticLoopResult = {
  finalText: string;
  turns: number;
  totalToolCalls: number;
  terminationReason: "final_answer" | "max_turns" | "max_runtime" | "error" | "no_tools";
  traces: AdapterTraceRow[];
  approvalRequired: Array<{ toolName: string; details: string; argsJson: string }>;
};

/**
 * Estimate token count from messages. Rough heuristic: 1 token ≈ 4 chars.
 * Only counts user-visible content, not structural overhead.
 */
function estimateMessageTokens(messages: ConversationMessage[]): number {
  let chars = 0;
  for (const m of messages) {
    if ("content" in m && typeof m.content === "string") {
      chars += m.content.length;
    } else if (m.role === "assistant_tool_calls") {
      chars += m.tool_calls.reduce((sum, c) => sum + c.arguments.length + c.name.length, 0);
    } else if (m.role === "tool_result") {
      chars += m.output.length;
    }
  }
  return Math.ceil(chars / 4);
}

/**
 * Trim messages to stay under a token budget. Keeps system + user messages
 * and the most recent turns. Drops oldest tool_result messages first (bulkiest),
 * then oldest assistant messages.
 */
const MAX_HISTORY_TOKENS = 24000;

function trimMessageHistory(messages: ConversationMessage[]): ConversationMessage[] {
  if (estimateMessageTokens(messages) <= MAX_HISTORY_TOKENS) return messages;

  // Always keep system (index 0) and user (index 1)
  const pinned = messages.slice(0, 2);
  const rest = messages.slice(2);

  // Drop oldest tool_result outputs first by truncating their content
  for (let i = 0; i < rest.length; i++) {
    const msg = rest[i];
    if (msg.role === "tool_result" && msg.output.length > 200) {
      rest[i] = { ...msg, output: msg.output.slice(0, 200) + "\n[trimmed]" };
    }
    if (estimateMessageTokens([...pinned, ...rest]) <= MAX_HISTORY_TOKENS) {
      return [...pinned, ...rest];
    }
  }

  // Still over budget — drop oldest turn pairs entirely, keep most recent
  while (rest.length > 4 && estimateMessageTokens([...pinned, ...rest]) > MAX_HISTORY_TOKENS) {
    rest.shift();
  }

  return [...pinned, ...rest];
}

export async function runAgenticLoop(input: {
  userId: string;
  delegatedTaskId: string;
  agentKind: string;
  systemPrompt: string;
  userMessage: string;
  tools: ToolDefinitionView[];
  config: {
    maxTurns: number;
    maxRuntimeMs: number;
    maxParallelCalls: number;
    maxToolRetries: number;
    requireApproval: boolean;
    maxOutputTokens?: number;
  };
  onEvent?: (event: AgenticStreamEvent) => void;
}): Promise<AgenticLoopResult> {
  const { userId, delegatedTaskId, agentKind, systemPrompt, userMessage, tools, config, onEvent } = input;
  const startedAt = Date.now();
  const traces: AdapterTraceRow[] = [];
  const approvalRequired: AgenticLoopResult["approvalRequired"] = [];
  let turns = 0;
  let totalToolCalls = 0;
  let lastText = "";

  if (tools.length === 0) {
    return {
      finalText: "",
      turns: 0,
      totalToolCalls: 0,
      terminationReason: "no_tools",
      traces: [],
      approvalRequired: [],
    };
  }

  const llmSpecs = toolDefsToLlmSpecs(tools);
  const toolDefMap = new Map(tools.map((t) => [t.name, t]));

  const messages: ConversationMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  for (let turn = 1; turn <= config.maxTurns; turn++) {
    turns = turn;

    // Check runtime budget
    if (Date.now() - startedAt > config.maxRuntimeMs) {
      traces.push({
        toolName: "agentic.loop",
        phase: "execute",
        status: "error",
        latencyMs: Date.now() - startedAt,
        inputSummary: `Turn ${turn}: runtime budget exceeded`,
        outputSummary: `Exceeded ${config.maxRuntimeMs}ms budget`,
      });
      const finalText = lastText || "Agent loop terminated: runtime budget exceeded.";
      onEvent?.({ type: "final_answer", text: finalText, turns, totalToolCalls, terminationReason: "max_runtime" });
      return { finalText, turns, totalToolCalls, terminationReason: "max_runtime", traces, approvalRequired };
    }

    // Call LLM with tools
    onEvent?.({ type: "llm_call", turn });
    const turnStart = Date.now();
    const llmResult = await callAgentLlmWithTools({
      userId,
      agentKind: agentKind as AgentKindRouteKey,
      messages,
      tools: llmSpecs,
      maxOutputTokens: config.maxOutputTokens,
    });

    if (llmResult.kind === "error") {
      traces.push({
        toolName: "agentic.llm",
        phase: "execute",
        status: "error",
        latencyMs: Date.now() - turnStart,
        inputSummary: `Turn ${turn}: LLM call failed`,
        outputSummary: llmResult.error.slice(0, 220),
      });
      onEvent?.({ type: "error", message: llmResult.error });
      return {
        finalText: lastText || `Agent error: ${llmResult.error}`,
        turns,
        totalToolCalls,
        terminationReason: "error",
        traces,
        approvalRequired,
      };
    }

    if (llmResult.kind === "text") {
      lastText = llmResult.text;
      traces.push({
        toolName: "agentic.llm",
        phase: "execute",
        status: "ok",
        latencyMs: Date.now() - turnStart,
        inputSummary: `Turn ${turn}: final answer (${llmResult.provider}:${llmResult.model})`,
        outputSummary: llmResult.text.slice(0, 220),
      });
      messages.push({ role: "assistant", content: llmResult.text });
      onEvent?.({ type: "final_answer", text: llmResult.text, turns, totalToolCalls, terminationReason: "final_answer" });
      return { finalText: llmResult.text, turns, totalToolCalls, terminationReason: "final_answer", traces, approvalRequired };
    }

    // kind === "tool_calls"
    const calls = llmResult.calls;
    totalToolCalls += calls.length;

    onEvent?.({
      type: "llm_result",
      turn,
      provider: llmResult.provider,
      model: llmResult.model,
      toolNames: calls.map((c) => c.name),
    });

    traces.push({
      toolName: "agentic.llm",
      phase: "execute",
      status: "ok",
      latencyMs: Date.now() - turnStart,
      inputSummary: `Turn ${turn}: ${calls.length} tool call(s) (${llmResult.provider}:${llmResult.model})`,
      outputSummary: calls.map((c) => c.name).join(", ").slice(0, 220),
    });

    messages.push({ role: "assistant_tool_calls", tool_calls: calls });

    // Emit tool_call events before executing
    for (const call of calls) {
      onEvent?.({ type: "tool_call", turn, toolName: call.name, argsSummary: call.arguments.slice(0, 120) });
    }

    // Execute all tool calls in parallel
    const execStart = Date.now();
    const results = await executeToolCallsParallel(calls, toolDefMap, {
      userId,
      delegatedTaskId,
      agentKind,
      requireApproval: config.requireApproval,
    }, config.maxParallelCalls);

    // Record traces and feed results back to messages
    for (const call of calls) {
      const result = results.get(call.id);
      if (!result) continue;

      if (result.status === "approval_required") {
        approvalRequired.push({ toolName: call.name, details: result.output.slice(0, 500), argsJson: call.arguments });
      }

      const traceStatus = result.status === "ok" ? "ok" : result.status === "approval_required" ? "blocked" : "error";

      traces.push({
        toolName: call.name,
        phase: "execute",
        status: traceStatus,
        latencyMs: result.latencyMs,
        inputSummary: `${call.name}(${call.arguments.slice(0, 140)})`,
        outputSummary: result.output.slice(0, 220),
      });

      onEvent?.({
        type: "tool_result",
        turn,
        toolName: call.name,
        status: traceStatus,
        summary: result.output.slice(0, 200),
        latencyMs: result.latencyMs,
      });

      messages.push({
        role: "tool_result",
        call_id: call.id,
        name: call.name,
        output: result.output.slice(0, 8000),
      });

      // Record to DelegatedTaskToolCall
      await prisma.delegatedTaskToolCall.create({
        data: {
          delegatedTaskId,
          toolName: call.name.slice(0, 120),
          phase: `agentic:turn:${turn}`,
          status: result.status.slice(0, 40),
          latencyMs: result.latencyMs,
          inputSummary: `${call.name}(${call.arguments.slice(0, 180)})`.slice(0, 240),
          outputSummary: result.output.slice(0, 240),
        },
      }).catch(() => {
        // Non-fatal: trace recording failure should not halt execution
      });
    }

    traces.push({
      toolName: "agentic.executor",
      phase: "execute",
      status: "ok",
      latencyMs: Date.now() - execStart,
      inputSummary: `Turn ${turn}: executed ${calls.length} tool(s)`,
      outputSummary: `Parallel execution completed in ${Date.now() - execStart}ms`,
    });

    // Trim history to prevent context window overflow on long-running agents
    const trimmed = trimMessageHistory(messages);
    if (trimmed.length < messages.length) {
      messages.length = 0;
      messages.push(...trimmed);
    }
  }

  // Exhausted max turns
  const finalText = lastText || "Agent loop completed maximum turns without producing a final answer.";
  onEvent?.({ type: "final_answer", text: finalText, turns, totalToolCalls, terminationReason: "max_turns" });
  return { finalText, turns, totalToolCalls, terminationReason: "max_turns", traces, approvalRequired };
}
