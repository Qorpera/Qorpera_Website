import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetModelRouteForAgentKind, mockGetProviderApiKeyRuntime, mockCheckManagedGuardrails, mockRecordManagedUsage, mockPostOllamaJson } = vi.hoisted(() => ({
  mockGetModelRouteForAgentKind: vi.fn(),
  mockGetProviderApiKeyRuntime: vi.fn(),
  mockCheckManagedGuardrails: vi.fn(),
  mockRecordManagedUsage: vi.fn(),
  mockPostOllamaJson: vi.fn(),
}));

vi.mock("@/lib/model-routing-store", () => ({
  getModelRouteForAgentKind: mockGetModelRouteForAgentKind,
}));

vi.mock("@/lib/connectors-store", () => ({
  getProviderApiKeyRuntime: mockGetProviderApiKeyRuntime,
  checkManagedGuardrails: mockCheckManagedGuardrails,
  recordManagedUsage: mockRecordManagedUsage,
}));

vi.mock("@/lib/ollama", () => ({
  postOllamaJson: mockPostOllamaJson,
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { callAgentLlm } from "@/lib/agent-llm";

describe("callAgentLlm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("OpenAI path", () => {
    it("calls OpenAI and returns result", async () => {
      mockGetModelRouteForAgentKind.mockResolvedValue({
        provider: "OPENAI",
        modelName: "gpt-4.1-mini",
      });
      mockGetProviderApiKeyRuntime.mockResolvedValue({
        apiKey: "sk-test",
        mode: "BYOK",
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ output_text: "Analysis result" }),
      });

      const result = await callAgentLlm({
        userId: "user-1",
        agentKind: "ASSISTANT",
        systemPrompt: "You are an assistant.",
        userMessage: "Analyze this task",
      });

      expect(result.text).toBe("Analysis result");
      expect(result.provider).toBe("OPENAI");
      expect(result.model).toBe("gpt-4.1-mini");
      expect(result.error).toBeUndefined();
    });

    it("returns error when no API key configured", async () => {
      mockGetModelRouteForAgentKind.mockResolvedValue({
        provider: "OPENAI",
        modelName: "gpt-4.1-mini",
      });
      mockGetProviderApiKeyRuntime.mockResolvedValue({
        apiKey: null,
        mode: "BYOK",
      });

      const result = await callAgentLlm({
        userId: "user-1",
        agentKind: "CHIEF_ADVISOR",
        systemPrompt: "System prompt",
        userMessage: "Task message",
      });

      expect(result.text).toBe("");
      expect(result.error).toBe("No OpenAI API key configured");
    });

    it("returns error when managed guardrails block", async () => {
      mockGetModelRouteForAgentKind.mockResolvedValue({
        provider: "OPENAI",
        modelName: "gpt-4.1-mini",
      });
      mockGetProviderApiKeyRuntime.mockResolvedValue({
        apiKey: "sk-test",
        mode: "MANAGED",
      });
      mockCheckManagedGuardrails.mockResolvedValue({ allowed: false });

      const result = await callAgentLlm({
        userId: "user-1",
        agentKind: "ASSISTANT",
        systemPrompt: "System prompt",
        userMessage: "Task message",
      });

      expect(result.text).toBe("");
      expect(result.error).toContain("guardrails");
    });
  });

  describe("Ollama path", () => {
    it("calls Ollama chat endpoint", async () => {
      mockGetModelRouteForAgentKind.mockResolvedValue({
        provider: "OLLAMA",
        modelName: "llama3.1:8b",
      });
      mockPostOllamaJson.mockResolvedValue({
        ok: true,
        data: { message: { content: "Ollama analysis" } },
      });

      const result = await callAgentLlm({
        userId: "user-1",
        agentKind: "PROJECT_MANAGER",
        systemPrompt: "System prompt",
        userMessage: "Task message",
      });

      expect(result.text).toBe("Ollama analysis");
      expect(result.provider).toBe("OLLAMA");
      expect(result.model).toBe("llama3.1:8b");
    });

    it("falls back to generate endpoint when chat fails", async () => {
      mockGetModelRouteForAgentKind.mockResolvedValue({
        provider: "OLLAMA",
        modelName: "mistral:7b",
      });
      mockPostOllamaJson
        .mockResolvedValueOnce({ ok: false, error: "chat failed" })
        .mockResolvedValueOnce({
          ok: true,
          data: { response: "Generated analysis" },
        });

      const result = await callAgentLlm({
        userId: "user-1",
        agentKind: "ASSISTANT",
        systemPrompt: "System prompt",
        userMessage: "Task message",
      });

      expect(result.text).toBe("Generated analysis");
      expect(mockPostOllamaJson).toHaveBeenCalledTimes(2);
    });
  });
});
