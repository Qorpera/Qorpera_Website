/**
 * Research engine for the agent optimizer.
 *
 * Fetches the latest knowledge on agentic AI design and prompt engineering.
 * Uses Tavily API if TAVILY_API_KEY is available, otherwise uses an LLM
 * knowledge synthesis approach (the LLM draws on its training data of papers
 * and produces structured citations).
 */

import type { ResearchFinding } from "./types";

const RESEARCH_TOPICS = [
  {
    topic: "reasoning_chain",
    query: "chain-of-thought prompting agentic AI reasoning best practices 2024",
  },
  {
    topic: "multi_agent_architecture",
    query: "multi-agent LLM orchestration system design patterns autonomous agents 2024 2025",
  },
  {
    topic: "grounding_and_hallucination",
    query: "LLM grounding anti-hallucination enterprise business AI agent prompts",
  },
  {
    topic: "tool_use_design",
    query: "ReAct reasoning acting framework LLM tool use agent prompt engineering",
  },
  {
    topic: "uncertainty_communication",
    query: "AI agent uncertainty quantification communication business context",
  },
  {
    topic: "output_quality",
    query: "structured output prompt engineering quality criteria LLM agents",
  },
  {
    topic: "context_management",
    query: "LLM context window management long context agents business memory retrieval",
  },
  {
    topic: "delegation_routing",
    query: "multi-agent task delegation routing classification prompt design",
  },
];

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
};

type TavilyResponse = {
  results?: TavilyResult[];
};

async function tavilySearch(
  query: string,
  apiKey: string,
): Promise<{ title: string; url: string; snippet: string }[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 4,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => null)) as TavilyResponse | null;
  return (data?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content.slice(0, 600),
  }));
}

export async function runResearch(
  llmCaller: (system: string, user: string) => Promise<string | null>,
  tavilyApiKey?: string | null,
): Promise<ResearchFinding[]> {
  if (tavilyApiKey) {
    return runTavilyResearch(tavilyApiKey, llmCaller);
  }
  return runLlmKnowledgeResearch(llmCaller);
}

async function runTavilyResearch(
  tavilyApiKey: string,
  llmCaller: (system: string, user: string) => Promise<string | null>,
): Promise<ResearchFinding[]> {
  const allFindings: ResearchFinding[] = [];

  await Promise.allSettled(
    RESEARCH_TOPICS.map(async ({ topic, query }) => {
      const sources = await tavilySearch(query, tavilyApiKey).catch(() => []);
      if (sources.length === 0) return;

      // Ask LLM to synthesize sources into structured findings
      const synthesisPrompt = `You are an AI research analyst. Based on the following search results about "${query}", extract structured research findings about prompt engineering and agentic AI design.

SEARCH RESULTS:
${sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet}`).join("\n\n")}

Return a JSON array (no markdown) of 2-3 findings, each with this shape:
{
  "topic": "${topic}",
  "technique": "name of the technique or principle",
  "source": "Author(s), Year — Title (from the search results or your knowledge)",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "applicability": "high|medium|low",
  "url": "url if from search results"
}`;

      const raw = await llmCaller(
        "You extract structured research findings from search results. Return only valid JSON arrays.",
        synthesisPrompt,
      ).catch(() => null);

      if (!raw) return;
      try {
        const first = raw.indexOf("[");
        const last = raw.lastIndexOf("]");
        if (first === -1 || last === -1) return;
        const parsed = JSON.parse(raw.slice(first, last + 1)) as ResearchFinding[];
        allFindings.push(...parsed.filter((f) => f.technique && f.keyInsights?.length));
      } catch {
        // ignore malformed
      }
    }),
  );

  // If Tavily gave us nothing useful, supplement with LLM knowledge
  if (allFindings.length < 4) {
    const supplemental = await runLlmKnowledgeResearch(llmCaller);
    allFindings.push(...supplemental.slice(0, Math.max(0, 8 - allFindings.length)));
  }

  return allFindings;
}

async function runLlmKnowledgeResearch(
  llmCaller: (system: string, user: string) => Promise<string | null>,
): Promise<ResearchFinding[]> {
  const prompt = `You are an expert in AI/ML research with deep knowledge of agentic AI systems and prompt engineering.

Generate a structured research digest covering the most impactful techniques and papers for designing high-quality LLM agent system prompts for a business AI platform. Focus on:
1. Chain-of-thought and reasoning chain prompting
2. Multi-agent orchestration and task routing
3. Grounding, anti-hallucination, and factual accuracy
4. ReAct (Reasoning + Acting) patterns
5. Uncertainty quantification and communication
6. Structured output quality and format adherence
7. Context window management and memory
8. Delegation and agent routing precision

Return a JSON array (no markdown, no preamble) of exactly 12 research findings, each with this shape:
{
  "topic": "one of: reasoning_chain | multi_agent_architecture | grounding_and_hallucination | tool_use_design | uncertainty_communication | output_quality | context_management | delegation_routing",
  "technique": "name of technique or principle",
  "source": "Author(s), Year — Paper/Post title (be as accurate as possible from your training data)",
  "keyInsights": ["specific actionable insight 1", "insight 2", "insight 3"],
  "applicability": "high|medium|low"
}

Be specific. Use real paper titles and authors where possible. Insights should be directly actionable for prompt engineering.`;

  const raw = await llmCaller(
    "You are an AI research expert. Return only valid JSON arrays with no preamble.",
    prompt,
  ).catch(() => null);

  if (!raw) return getFallbackResearch();

  try {
    const first = raw.indexOf("[");
    const last = raw.lastIndexOf("]");
    if (first === -1 || last === -1) return getFallbackResearch();
    const parsed = JSON.parse(raw.slice(first, last + 1)) as ResearchFinding[];
    const valid = parsed.filter((f) => f.topic && f.technique && Array.isArray(f.keyInsights));
    return valid.length >= 4 ? valid : getFallbackResearch();
  } catch {
    return getFallbackResearch();
  }
}

// Hardcoded fallback if LLM calls fail entirely
function getFallbackResearch(): ResearchFinding[] {
  return [
    {
      topic: "reasoning_chain",
      technique: "Chain-of-Thought (CoT) Prompting",
      source: "Wei et al., 2022 — Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
      keyInsights: [
        "Explicit step-by-step reasoning improves complex task accuracy significantly",
        "Intermediate reasoning steps should be made visible in the prompt",
        "Trigger phrases like 'Let's think step by step' activate latent reasoning capabilities",
      ],
      applicability: "high",
    },
    {
      topic: "tool_use_design",
      technique: "ReAct (Reasoning + Acting)",
      source: "Yao et al., 2022 — ReAct: Synergizing Reasoning and Acting in Language Models",
      keyInsights: [
        "Interleaving reasoning traces with tool actions improves accuracy and interpretability",
        "Reasoning before acting reduces tool misuse and hallucinated tool outputs",
        "The pattern: Thought → Action → Observation → next Thought",
      ],
      applicability: "high",
    },
    {
      topic: "grounding_and_hallucination",
      technique: "Retrieval-Augmented Grounding",
      source: "Lewis et al., 2020 — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      keyInsights: [
        "Ground every factual claim in retrieved context, not parametric memory",
        "Explicit instructions to cite source data reduce fabrication by 40-60%",
        "Negative constraints ('do not invent') are more effective when paired with positive protocols ('only cite from X')",
      ],
      applicability: "high",
    },
    {
      topic: "uncertainty_communication",
      technique: "Calibrated Uncertainty Expression",
      source: "Kadavath et al., 2022 — Language Models (Mostly) Know What They Know",
      keyInsights: [
        "Models can express calibrated confidence when explicitly instructed to",
        "Structured uncertainty tiers (high/medium/low confidence) improve user trust",
        "Explicit protocols like 'if unsure, say so' reduce overconfident hallucinations",
      ],
      applicability: "high",
    },
    {
      topic: "multi_agent_architecture",
      technique: "Specialist Agent Routing",
      source: "Wu et al., 2023 — AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation",
      keyInsights: [
        "Clear role boundaries between agents reduce task confusion and improve output quality",
        "Routing tables with specific examples outperform abstract role descriptions",
        "Handoff protocols (when to delegate vs. handle) must be explicit",
      ],
      applicability: "high",
    },
    {
      topic: "output_quality",
      technique: "Structured Output Contracts",
      source: "Anthropic, 2023 — Constitutional AI: Harmlessness from AI Feedback",
      keyInsights: [
        "Output contracts that specify quality criteria (not just format) produce better results",
        "Self-critique steps before finalizing outputs improve factual accuracy",
        "Negative examples in output contracts ('do not do X') are highly effective",
      ],
      applicability: "medium",
    },
    {
      topic: "context_management",
      technique: "Selective Context Injection",
      source: "Liu et al., 2023 — Lost in the Middle: How Language Models Use Long Contexts",
      keyInsights: [
        "LLMs perform best when relevant context appears at the start or end of the prompt",
        "Relevance-scored context injection (most relevant first) improves grounding",
        "Explicit markers ('MOST RELEVANT:', 'RECENT:') help models prioritize context",
      ],
      applicability: "high",
    },
    {
      topic: "delegation_routing",
      technique: "Intent-Based Task Classification",
      source: "OpenAI, 2023 — Function Calling and Structured Outputs documentation",
      keyInsights: [
        "Routing rules with concrete examples of input → agent mappings reduce ambiguity",
        "Explicit 'use when' and 'do not use when' criteria improve routing accuracy",
        "Fallback protocols for ambiguous cases prevent deadlocks",
      ],
      applicability: "medium",
    },
  ];
}
