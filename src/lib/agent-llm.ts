/**
 * Generic LLM call utility for agent task reasoning.
 * Supports both OpenAI and Ollama based on the user's model route configuration.
 * Mirrors the patterns from advisor.ts but simplified for task-level reasoning.
 */

import { getModelRouteForAgentKind, type AgentKindRouteKey } from "@/lib/model-routing-store";
import { getProviderApiKeyRuntime, checkManagedGuardrails, recordManagedUsage } from "@/lib/connectors-store";
import { postOllamaJson } from "@/lib/ollama";
import type { LlmToolSpec } from "@/lib/tool-registry";

export type AgentLlmResult = {
  text: string;
  provider: "OPENAI" | "OLLAMA" | "ANTHROPIC" | "GOOGLE";
  model: string;
  error?: string;
};

export type ToolCallRequest = {
  id: string;
  name: string;
  arguments: string;
};

export type AgentLlmToolResult =
  | { kind: "text"; text: string; provider: "OPENAI" | "OLLAMA" | "ANTHROPIC" | "GOOGLE"; model: string }
  | { kind: "tool_calls"; calls: ToolCallRequest[]; provider: "OPENAI" | "OLLAMA" | "ANTHROPIC" | "GOOGLE"; model: string }
  | { kind: "error"; error: string; provider: "OPENAI" | "OLLAMA" | "ANTHROPIC" | "GOOGLE"; model: string };

export type ConversationMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "assistant_tool_calls"; tool_calls: ToolCallRequest[] }
  | { role: "tool_result"; call_id: string; name: string; output: string };

function clampText(text: string, max = 5000) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function callOpenAI(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  maxOutputTokens?: number;
}): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: input.systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: clampText(input.userMessage, 32000) }],
        },
      ],
      max_output_tokens: input.maxOutputTokens ?? 8192,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(err?.error?.message || `OpenAI request failed (${response.status})`);
  }

  const data = (await response.json().catch(() => null)) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  } | null;

  return (
    data?.output_text ??
    data?.output
      ?.flatMap((o) => o.content ?? [])
      .map((c) => c.text ?? "")
      .join("\n") ??
    null
  );
}

async function callAnthropic(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  maxOutputTokens?: number;
}): Promise<string | null> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxOutputTokens ?? 8192,
      system: input.systemPrompt,
      messages: [{ role: "user", content: clampText(input.userMessage, 32000) }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message || `Anthropic request failed (${response.status})`);
  }

  const data = (await response.json().catch(() => null)) as {
    content?: Array<{ type?: string; text?: string }>;
  } | null;

  return data?.content?.find((c) => c.type === "text")?.text ?? null;
}

async function callGoogle(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  maxOutputTokens?: number;
}): Promise<string | null> {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent`,
  );
  url.searchParams.set("key", input.apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: clampText(input.userMessage, 32000) }] }],
      generationConfig: { maxOutputTokens: input.maxOutputTokens ?? 8192, temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message || `Google AI request failed (${response.status})`);
  }

  const data = (await response.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null;

  return data?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text ?? null;
}

async function callOllama(input: {
  model: string;
  systemPrompt: string;
  userMessage: string;
  maxOutputTokens?: number;
}): Promise<string | null> {
  const chatResult = await postOllamaJson<{ message?: { content?: string }; response?: string }>(
    "/api/chat",
    {
      model: input.model,
      stream: false,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: clampText(input.userMessage, 18000) },
      ],
      options: { temperature: 0.3, num_predict: input.maxOutputTokens ?? 8192 },
    },
    { timeoutMs: 90000 },
  );

  if (chatResult.ok) {
    const text = chatResult.data.message?.content ?? chatResult.data.response;
    if (text) return text;
  }

  // Fallback to generate endpoint
  const genResult = await postOllamaJson<{ response?: string; message?: { content?: string } }>(
    "/api/generate",
    {
      model: input.model,
      stream: false,
      prompt: `${input.systemPrompt}\n\n${clampText(input.userMessage, 18000)}`,
      options: { temperature: 0.3 },
    },
    { timeoutMs: 90000 },
  );

  if (!genResult.ok) {
    const reason = [
      chatResult.ok ? null : chatResult.error,
      genResult.error,
    ].filter(Boolean).join(" | ");
    throw new Error(reason || `Ollama request failed for model "${input.model}"`);
  }

  return genResult.data.response ?? genResult.data.message?.content ?? null;
}

export async function callAgentLlm(input: {
  userId: string;
  agentKind: AgentKindRouteKey;
  systemPrompt: string;
  userMessage: string;
  maxOutputTokens?: number;
}): Promise<AgentLlmResult> {
  const route = await getModelRouteForAgentKind(input.userId, input.agentKind);

  if (route.provider === "OLLAMA") {
    const text = await callOllama({
      model: route.modelName,
      systemPrompt: input.systemPrompt,
      userMessage: input.userMessage,
      maxOutputTokens: input.maxOutputTokens,
    });

    return {
      text: text ?? "",
      provider: "OLLAMA",
      model: route.modelName,
    };
  }

  if (route.provider === "ANTHROPIC") {
    const runtime = await getProviderApiKeyRuntime(input.userId, "ANTHROPIC");
    if (!runtime.apiKey) {
      return { text: "", provider: "ANTHROPIC", model: route.modelName, error: "No Anthropic API key configured" };
    }
    if (runtime.mode === "MANAGED") {
      const guardrails = await checkManagedGuardrails(input.userId, "ANTHROPIC");
      if (!guardrails.allowed) {
        return { text: "", provider: "ANTHROPIC", model: route.modelName, error: "Managed guardrails blocked this request" };
      }
    }
    const text = await callAnthropic({
      apiKey: runtime.apiKey,
      model: route.modelName,
      systemPrompt: input.systemPrompt,
      userMessage: input.userMessage,
      maxOutputTokens: input.maxOutputTokens,
    });
    if (runtime.mode === "MANAGED") {
      await recordManagedUsage(input.userId, "ANTHROPIC", { requestCount: 1, estimatedUsd: 0.015 });
    }
    return { text: text ?? "", provider: "ANTHROPIC", model: route.modelName };
  }

  if (route.provider === "GOOGLE") {
    const runtime = await getProviderApiKeyRuntime(input.userId, "GOOGLE");
    if (!runtime.apiKey) {
      return { text: "", provider: "GOOGLE", model: route.modelName, error: "No Google AI API key configured" };
    }
    if (runtime.mode === "MANAGED") {
      const guardrails = await checkManagedGuardrails(input.userId, "GOOGLE");
      if (!guardrails.allowed) {
        return { text: "", provider: "GOOGLE", model: route.modelName, error: "Managed guardrails blocked this request" };
      }
    }
    const text = await callGoogle({
      apiKey: runtime.apiKey,
      model: route.modelName,
      systemPrompt: input.systemPrompt,
      userMessage: input.userMessage,
      maxOutputTokens: input.maxOutputTokens,
    });
    if (runtime.mode === "MANAGED") {
      await recordManagedUsage(input.userId, "GOOGLE", { requestCount: 1, estimatedUsd: 0.005 });
    }
    return { text: text ?? "", provider: "GOOGLE", model: route.modelName };
  }

  // OpenAI path
  const runtime = await getProviderApiKeyRuntime(input.userId, "OPENAI");
  if (!runtime.apiKey) {
    return {
      text: "",
      provider: "OPENAI",
      model: route.modelName,
      error: "No OpenAI API key configured",
    };
  }

  if (runtime.mode === "MANAGED") {
    const guardrails = await checkManagedGuardrails(input.userId, "OPENAI");
    if (!guardrails.allowed) {
      return {
        text: "",
        provider: "OPENAI",
        model: route.modelName,
        error: "Managed guardrails blocked this request",
      };
    }
  }

  const text = await callOpenAI({
    apiKey: runtime.apiKey,
    model: route.modelName,
    systemPrompt: input.systemPrompt,
    userMessage: input.userMessage,
    maxOutputTokens: input.maxOutputTokens,
  });

  if (runtime.mode === "MANAGED") {
    await recordManagedUsage(input.userId, "OPENAI", { requestCount: 1, estimatedUsd: 0.01 });
  }

  return {
    text: text ?? "",
    provider: "OPENAI",
    model: route.modelName,
  };
}

// --- Tool-calling protocol ---

function conversationToOpenAIInput(messages: ConversationMessage[]) {
  const input: Array<Record<string, unknown>> = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      input.push({ role: "system", content: [{ type: "input_text", text: msg.content }] });
    } else if (msg.role === "user") {
      input.push({ role: "user", content: [{ type: "input_text", text: clampText(msg.content, 18000) }] });
    } else if (msg.role === "assistant") {
      input.push({ role: "assistant", content: [{ type: "output_text", text: msg.content }] });
    } else if (msg.role === "assistant_tool_calls") {
      for (const tc of msg.tool_calls) {
        input.push({ type: "function_call", id: tc.id, name: tc.name, arguments: tc.arguments });
      }
    } else if (msg.role === "tool_result") {
      input.push({ type: "function_call_output", call_id: msg.call_id, output: msg.output });
    }
  }
  return input;
}

function conversationToOllamaMessages(messages: ConversationMessage[]) {
  const result: Array<Record<string, unknown>> = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      result.push({ role: "system", content: msg.content });
    } else if (msg.role === "user") {
      result.push({ role: "user", content: clampText(msg.content, 18000) });
    } else if (msg.role === "assistant") {
      result.push({ role: "assistant", content: msg.content });
    } else if (msg.role === "assistant_tool_calls") {
      result.push({
        role: "assistant",
        content: "",
        tool_calls: msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.parse(tc.arguments) },
        })),
      });
    } else if (msg.role === "tool_result") {
      result.push({ role: "tool", content: msg.output });
    }
  }
  return result;
}

function toolSpecsToOpenAIFormat(tools: LlmToolSpec[]) {
  return tools.map((t) => ({
    type: "function" as const,
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

function conversationToAnthropicMessages(messages: ConversationMessage[]) {
  const result: Array<Record<string, unknown>> = [];
  for (const msg of messages) {
    if (msg.role === "system") continue; // handled via system param
    if (msg.role === "user") {
      result.push({ role: "user", content: clampText(msg.content, 18000) });
    } else if (msg.role === "assistant") {
      result.push({ role: "assistant", content: msg.content });
    } else if (msg.role === "assistant_tool_calls") {
      result.push({
        role: "assistant",
        content: msg.tool_calls.map((tc) => ({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: JSON.parse(tc.arguments),
        })),
      });
    } else if (msg.role === "tool_result") {
      result.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: msg.call_id, content: msg.output }],
      });
    }
  }
  return result;
}

function conversationToGoogleContents(messages: ConversationMessage[]) {
  const result: Array<Record<string, unknown>> = [];
  for (const msg of messages) {
    if (msg.role === "system") continue; // handled via systemInstruction
    if (msg.role === "user") {
      result.push({ role: "user", parts: [{ text: clampText(msg.content, 18000) }] });
    } else if (msg.role === "assistant") {
      result.push({ role: "model", parts: [{ text: msg.content }] });
    } else if (msg.role === "assistant_tool_calls") {
      result.push({
        role: "model",
        parts: msg.tool_calls.map((tc) => ({
          functionCall: { name: tc.name, args: JSON.parse(tc.arguments) },
        })),
      });
    } else if (msg.role === "tool_result") {
      result.push({
        role: "user",
        parts: [{ functionResponse: { name: msg.name, response: { output: msg.output } } }],
      });
    }
  }
  return result;
}

function toolSpecsToAnthropicFormat(tools: LlmToolSpec[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

function toolSpecsToGoogleFormat(tools: LlmToolSpec[]) {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];
}

function toolSpecsToOllamaFormat(tools: LlmToolSpec[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

type OpenAIResponseOutput = Array<{
  type?: string;
  id?: string;
  name?: string;
  arguments?: string;
  content?: Array<{ type?: string; text?: string }>;
}>;

function parseOpenAIToolResponse(output: OpenAIResponseOutput): ToolCallRequest[] | null {
  const calls: ToolCallRequest[] = [];
  for (const item of output) {
    if (item.type === "function_call" && item.id && item.name) {
      calls.push({ id: item.id, name: item.name, arguments: item.arguments ?? "{}" });
    }
  }
  return calls.length > 0 ? calls : null;
}

function extractOpenAITextResponse(data: { output_text?: string; output?: OpenAIResponseOutput }): string {
  if (data.output_text) return data.output_text;
  if (!data.output) return "";
  return data.output
    .flatMap((o) => o.content ?? [])
    .map((c) => c.text ?? "")
    .join("\n");
}

type OllamaChatToolResponse = {
  message?: {
    content?: string;
    tool_calls?: Array<{
      id?: string;
      function?: { name?: string; arguments?: Record<string, unknown> };
    }>;
  };
  response?: string;
};

export async function callAgentLlmWithTools(input: {
  userId: string;
  agentKind: AgentKindRouteKey;
  messages: ConversationMessage[];
  tools?: LlmToolSpec[];
  maxOutputTokens?: number;
}): Promise<AgentLlmToolResult> {
  const route = await getModelRouteForAgentKind(input.userId, input.agentKind);
  const hasTools = input.tools && input.tools.length > 0;
  const maxTokens = input.maxOutputTokens ?? 8192;

  if (route.provider === "ANTHROPIC") {
    const runtimeA = await getProviderApiKeyRuntime(input.userId, "ANTHROPIC");
    if (!runtimeA.apiKey) {
      return { kind: "error", error: "No Anthropic API key configured", provider: "ANTHROPIC", model: route.modelName };
    }
    if (runtimeA.mode === "MANAGED") {
      const g = await checkManagedGuardrails(input.userId, "ANTHROPIC");
      if (!g.allowed) {
        return { kind: "error", error: "Managed guardrails blocked this request", provider: "ANTHROPIC", model: route.modelName };
      }
    }
    const systemMsg = input.messages.find((m) => m.role === "system");
    const anthropicMessages = conversationToAnthropicMessages(input.messages);
    const anthropicTools = hasTools ? toolSpecsToAnthropicFormat(input.tools!) : undefined;
    const aResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": runtimeA.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: route.modelName,
        max_tokens: maxTokens,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: anthropicMessages,
        ...(anthropicTools ? { tools: anthropicTools } : {}),
        temperature: 0.3,
      }),
    });
    if (!aResponse.ok) {
      const err = (await aResponse.json().catch(() => null)) as { error?: { message?: string } } | null;
      return { kind: "error", error: err?.error?.message ?? `Anthropic request failed (${aResponse.status})`, provider: "ANTHROPIC", model: route.modelName };
    }
    const aData = (await aResponse.json().catch(() => null)) as {
      stop_reason?: string;
      content?: Array<{ type?: string; id?: string; name?: string; input?: Record<string, unknown>; text?: string }>;
    } | null;
    if (runtimeA.mode === "MANAGED") {
      await recordManagedUsage(input.userId, "ANTHROPIC", { requestCount: 1, estimatedUsd: 0.02 });
    }
    if (!aData) return { kind: "error", error: "Invalid Anthropic response", provider: "ANTHROPIC", model: route.modelName };
    if (aData.stop_reason === "tool_use") {
      const calls: ToolCallRequest[] = (aData.content ?? [])
        .filter((c) => c.type === "tool_use" && c.id && c.name)
        .map((c) => ({ id: c.id!, name: c.name!, arguments: JSON.stringify(c.input ?? {}) }));
      if (calls.length > 0) return { kind: "tool_calls", calls, provider: "ANTHROPIC", model: route.modelName };
    }
    const aText = (aData.content ?? []).find((c) => c.type === "text")?.text ?? "";
    return { kind: "text", text: aText, provider: "ANTHROPIC", model: route.modelName };
  }

  if (route.provider === "GOOGLE") {
    const runtimeG = await getProviderApiKeyRuntime(input.userId, "GOOGLE");
    if (!runtimeG.apiKey) {
      return { kind: "error", error: "No Google AI API key configured", provider: "GOOGLE", model: route.modelName };
    }
    if (runtimeG.mode === "MANAGED") {
      const g = await checkManagedGuardrails(input.userId, "GOOGLE");
      if (!g.allowed) {
        return { kind: "error", error: "Managed guardrails blocked this request", provider: "GOOGLE", model: route.modelName };
      }
    }
    const systemMsg = input.messages.find((m) => m.role === "system");
    const googleContents = conversationToGoogleContents(input.messages);
    const googleTools = hasTools ? toolSpecsToGoogleFormat(input.tools!) : undefined;
    const googleUrl = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${route.modelName}:generateContent`);
    googleUrl.searchParams.set("key", runtimeG.apiKey);
    const gResponse = await fetch(googleUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg.content }] } } : {}),
        contents: googleContents,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
        ...(googleTools ? { tools: googleTools } : {}),
      }),
    });
    if (!gResponse.ok) {
      const err = (await gResponse.json().catch(() => null)) as { error?: { message?: string } } | null;
      return { kind: "error", error: err?.error?.message ?? `Google AI request failed (${gResponse.status})`, provider: "GOOGLE", model: route.modelName };
    }
    const gData = (await gResponse.json().catch(() => null)) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string; functionCall?: { name?: string; args?: Record<string, unknown> } }>;
        };
        finishReason?: string;
      }>;
    } | null;
    if (runtimeG.mode === "MANAGED") {
      await recordManagedUsage(input.userId, "GOOGLE", { requestCount: 1, estimatedUsd: 0.005 });
    }
    if (!gData) return { kind: "error", error: "Invalid Google AI response", provider: "GOOGLE", model: route.modelName };
    const parts = gData.candidates?.[0]?.content?.parts ?? [];
    const fnCalls = parts.filter((p) => p.functionCall?.name);
    if (fnCalls.length > 0) {
      const calls: ToolCallRequest[] = fnCalls.map((p, i) => ({
        id: `google_tc_${i}_${Date.now()}`,
        name: p.functionCall!.name!,
        arguments: JSON.stringify(p.functionCall!.args ?? {}),
      }));
      return { kind: "tool_calls", calls, provider: "GOOGLE", model: route.modelName };
    }
    const gText = parts.find((p) => p.text)?.text ?? "";
    return { kind: "text", text: gText, provider: "GOOGLE", model: route.modelName };
  }

  if (route.provider === "OLLAMA") {
    const messages = conversationToOllamaMessages(input.messages);
    const tools = hasTools ? toolSpecsToOllamaFormat(input.tools!) : undefined;

    const chatResult = await postOllamaJson<OllamaChatToolResponse>(
      "/api/chat",
      {
        model: route.modelName,
        stream: false,
        messages,
        ...(tools ? { tools } : {}),
        options: { temperature: 0.3, num_predict: maxTokens },
      },
      { timeoutMs: 90000 },
    );

    if (!chatResult.ok) {
      return { kind: "error", error: chatResult.error, provider: "OLLAMA", model: route.modelName };
    }

    const msg = chatResult.data.message;
    if (msg?.tool_calls && msg.tool_calls.length > 0) {
      const calls: ToolCallRequest[] = msg.tool_calls.map((tc, i) => ({
        id: tc.id ?? `ollama_tc_${i}_${Date.now()}`,
        name: tc.function?.name ?? "unknown",
        arguments: JSON.stringify(tc.function?.arguments ?? {}),
      }));
      return { kind: "tool_calls", calls, provider: "OLLAMA", model: route.modelName };
    }

    const text = msg?.content ?? chatResult.data.response ?? "";
    return { kind: "text", text, provider: "OLLAMA", model: route.modelName };
  }

  // OpenAI path
  const runtime = await getProviderApiKeyRuntime(input.userId, "OPENAI");
  if (!runtime.apiKey) {
    return { kind: "error", error: "No OpenAI API key configured", provider: "OPENAI", model: route.modelName };
  }

  if (runtime.mode === "MANAGED") {
    const guardrails = await checkManagedGuardrails(input.userId, "OPENAI");
    if (!guardrails.allowed) {
      return { kind: "error", error: "Managed guardrails blocked this request", provider: "OPENAI", model: route.modelName };
    }
  }

  const openaiInput = conversationToOpenAIInput(input.messages);
  const tools = hasTools ? toolSpecsToOpenAIFormat(input.tools!) : undefined;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${runtime.apiKey}`,
    },
    body: JSON.stringify({
      model: route.modelName,
      input: openaiInput,
      max_output_tokens: maxTokens,
      temperature: 0.3,
      ...(tools ? { tools } : {}),
    }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    return {
      kind: "error",
      error: err?.error?.message ?? `OpenAI request failed (${response.status})`,
      provider: "OPENAI",
      model: route.modelName,
    };
  }

  const data = (await response.json().catch(() => null)) as {
    output_text?: string;
    output?: OpenAIResponseOutput;
  } | null;

  if (runtime.mode === "MANAGED") {
    await recordManagedUsage(input.userId, "OPENAI", { requestCount: 1, estimatedUsd: 0.02 });
  }

  if (!data) {
    return { kind: "error", error: "Invalid OpenAI response", provider: "OPENAI", model: route.modelName };
  }

  const toolCalls = data.output ? parseOpenAIToolResponse(data.output) : null;
  if (toolCalls) {
    return { kind: "tool_calls", calls: toolCalls, provider: "OPENAI", model: route.modelName };
  }

  const text = extractOpenAITextResponse(data);
  return { kind: "text", text, provider: "OPENAI", model: route.modelName };
}
