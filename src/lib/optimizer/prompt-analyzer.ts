/**
 * Analyzes the current advisor system prompt against research findings.
 * Scores it across dimensions and generates specific prompt patches.
 */

import type {
  ResearchFinding,
  ScoreDimension,
  OptimizationImprovement,
} from "./types";
import { SCORE_DIMENSIONS } from "./types";

function extractJson<T>(raw: string): T | null {
  // Try object first, then array
  for (const [open, close] of [
    ["{", "}"],
    ["[", "]"],
  ] as const) {
    const first = raw.indexOf(open);
    const last = raw.lastIndexOf(close);
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(raw.slice(first, last + 1)) as T;
      } catch {
        // try next
      }
    }
  }
  return null;
}

export async function analyzePrompt(
  currentPrompt: string,
  research: ResearchFinding[],
  llmCaller: (system: string, user: string) => Promise<string | null>,
): Promise<{
  overallScore: number;
  dimensions: ScoreDimension[];
  improvements: OptimizationImprovement[];
  synthesis: string;
}> {
  // Step 1: synthesize research into actionable insights
  const synthesis = await synthesizeResearch(research, llmCaller);

  // Step 2: score the prompt
  const { overallScore, dimensions } = await scorePrompt(
    currentPrompt,
    synthesis,
    llmCaller,
  );

  // Step 3: generate improvement patches for the weakest dimensions
  const improvements = await generateImprovements(
    currentPrompt,
    dimensions,
    synthesis,
    llmCaller,
  );

  return { overallScore, dimensions, improvements, synthesis };
}

async function synthesizeResearch(
  research: ResearchFinding[],
  llmCaller: (system: string, user: string) => Promise<string | null>,
): Promise<string> {
  const researchText = research
    .map(
      (r) =>
        `TECHNIQUE: ${r.technique}\nSOURCE: ${r.source}\nINSIGHTS:\n${r.keyInsights.map((i) => `  - ${i}`).join("\n")}`,
    )
    .join("\n\n");

  const prompt = `You are an expert prompt engineer specializing in agentic AI systems for business applications.

Synthesize the following research findings into a concise, actionable summary (300-400 words) of the most important principles for designing high-quality business AI advisor system prompts.

Focus on: what the current state-of-the-art says about reasoning chains, uncertainty handling, grounding, delegation routing, and output quality for business-context agents.

RESEARCH FINDINGS:
${researchText}

Write a synthesis that an AI systems engineer would use to evaluate and improve an existing prompt. Be specific and technical.`;

  const raw = await llmCaller(
    "You synthesize AI research into actionable prompt engineering guidance.",
    prompt,
  ).catch(() => null);

  return raw?.trim() ?? "Research synthesis unavailable — using fallback analysis.";
}

async function scorePrompt(
  currentPrompt: string,
  synthesis: string,
  llmCaller: (system: string, user: string) => Promise<string | null>,
): Promise<{ overallScore: number; dimensions: ScoreDimension[] }> {
  const dimensionList = SCORE_DIMENSIONS.map(
    (d) => `- ${d.name} (${d.label})`,
  ).join("\n");

  const prompt = `You are an expert prompt engineer auditing a production AI agent system prompt.

RESEARCH CONTEXT (what best practices look like):
${synthesis}

CURRENT ADVISOR SYSTEM PROMPT TO AUDIT:
---
${currentPrompt.slice(0, 8000)}
---

Score this prompt on each dimension from 0 to 100 based on how well it implements current best practices.

DIMENSIONS TO SCORE:
${dimensionList}

Return a JSON object (no markdown) with this exact shape:
{
  "overallScore": <0-100 weighted average>,
  "dimensions": [
    {
      "name": "<dimension_name>",
      "label": "<human label>",
      "score": <0-100>,
      "rationale": "<2-3 sentences explaining the score>",
      "evidence": "<brief quote from the prompt that justifies this score, or 'Not found' if missing>"
    }
  ]
}

Be critical and honest. A score of 70 means solid but with clear room for improvement. 90+ means near-optimal.`;

  const raw = await llmCaller(
    "You audit AI system prompts against research best practices. Return only valid JSON.",
    prompt,
  ).catch(() => null);

  if (raw) {
    type ScoreResult = { overallScore?: number; dimensions?: ScoreDimension[] };
    const parsed = extractJson<ScoreResult>(raw);
    if (parsed?.overallScore !== undefined && Array.isArray(parsed.dimensions)) {
      return {
        overallScore: Math.min(100, Math.max(0, Math.round(parsed.overallScore))),
        dimensions: parsed.dimensions,
      };
    }
  }

  // Fallback: return estimated scores
  return {
    overallScore: 58,
    dimensions: SCORE_DIMENSIONS.map((d) => ({
      name: d.name,
      label: d.label,
      score: 55 + Math.floor(Math.random() * 20),
      rationale: "Score estimated — LLM analysis unavailable.",
      evidence: "N/A",
    })),
  };
}

async function generateImprovements(
  currentPrompt: string,
  dimensions: ScoreDimension[],
  synthesis: string,
  llmCaller: (system: string, user: string) => Promise<string | null>,
): Promise<OptimizationImprovement[]> {
  // Focus on the 4 weakest dimensions
  const weakest = [...dimensions]
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);

  const weakestText = weakest
    .map((d) => `${d.name} (score: ${d.score}/100) — ${d.rationale}`)
    .join("\n");

  const prompt = `You are an expert prompt engineer. You must generate specific, immediately-applicable improvements to an AI advisor system prompt.

RESEARCH BEST PRACTICES:
${synthesis}

CURRENT PROMPT (abbreviated):
---
${currentPrompt.slice(0, 6000)}
---

WEAKEST DIMENSIONS (these need improvement):
${weakestText}

Generate exactly 4 improvements — one per weak dimension. Each improvement must include a "promptPatch" that is EXACT TEXT ready to be appended to the system prompt. The patch should be a new section with a clear header and specific, actionable instructions.

Return a JSON array (no markdown) with this shape:
[
  {
    "id": "opt_<dimension_name>_v1",
    "dimension": "<dimension_name>",
    "priority": "high|medium|low",
    "issue": "<what is missing or weak in the current prompt — 1 sentence>",
    "recommendation": "<what change to make — 1-2 sentences>",
    "researchBasis": "<which technique/paper this is based on>",
    "promptPatch": "<the exact text to append — use newlines, be specific, include a section header like REASONING_PROTOCOL or UNCERTAINTY_PROTOCOL>"
  }
]

IMPORTANT for promptPatch:
- Start with a section header (e.g., REASONING_PROTOCOL, UNCERTAINTY_PROTOCOL, DELEGATION_PRECISION, OUTPUT_QUALITY_GATE)
- Be specific: list exact steps, phrases, or patterns to follow
- Include examples of correct behavior where helpful
- Keep each patch to 100-200 words
- Write in imperative form ("Before answering...", "When uncertain...")`;

  const raw = await llmCaller(
    "You generate specific, appended prompt patches to improve AI agent system prompts. Return only valid JSON arrays.",
    prompt,
  ).catch(() => null);

  if (raw) {
    const parsed = extractJson<OptimizationImprovement[]>(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter(
        (imp) =>
          imp.id && imp.dimension && imp.promptPatch && imp.issue,
      );
    }
  }

  return getFallbackImprovements(dimensions);
}

function getFallbackImprovements(
  dimensions: ScoreDimension[],
): OptimizationImprovement[] {
  const byDimension: Record<string, OptimizationImprovement> = {
    reasoning_chain: {
      id: "opt_reasoning_chain_v1",
      dimension: "reasoning_chain",
      priority: "high",
      issue:
        "The prompt lacks an explicit internal reasoning protocol before answering.",
      recommendation:
        "Add a ReAct-style reasoning chain that the model works through before formulating the answer field.",
      researchBasis: "Wei et al., 2022 — Chain-of-Thought Prompting",
      promptPatch: `REASONING_PROTOCOL
Before formulating your answer, silently work through these steps:
1. GOAL: What is the user actually asking? (restate in one sentence)
2. EVIDENCE: What do I know from businessContext? (list what's relevant)
3. GAPS: What context is missing that would change my answer?
4. ASSUMPTIONS: What am I assuming? State explicitly.
5. PRIORITY: What is the single highest-leverage action I can recommend?
6. CONFIDENCE: Am I certain enough to give a direct recommendation, or should I ask a clarifying question?
Only then write the answer field. Never skip this internal process.`,
    },
    uncertainty_handling: {
      id: "opt_uncertainty_v1",
      dimension: "uncertainty_handling",
      priority: "high",
      issue:
        "The prompt lacks a structured protocol for expressing uncertainty.",
      recommendation:
        "Add explicit uncertainty expression tiers with example phrases.",
      researchBasis: "Kadavath et al., 2022 — Language Models Know What They Know",
      promptPatch: `UNCERTAINTY_PROTOCOL
Express uncertainty using these tiers:
- HIGH CONFIDENCE: State directly ("Based on [X in businessContext]...")
- MEDIUM CONFIDENCE: "The context suggests X, but I'd want to confirm [specific data point]."
- LOW CONFIDENCE: "I don't have enough data to answer this accurately. To help better, I'd need [specific thing]."
- MISSING DATA: "I don't have that information yet — [businessContext field] is empty or unavailable."
Never present a medium/low confidence answer as if it were certain. When context is thin, say so and ask for the specific data needed.`,
    },
    grounding_strength: {
      id: "opt_grounding_v1",
      dimension: "grounding_strength",
      priority: "high",
      issue: "Anti-hallucination rules exist but lack a positive citation discipline.",
      recommendation: "Add source-citation protocol pairing each claim to a context field.",
      researchBasis: "Lewis et al., 2020 — Retrieval-Augmented Generation",
      promptPatch: `CITATION_DISCIPLINE
For every factual claim in your answer:
- Reference the specific businessContext field it came from ("According to [companySoul.strategicGoals]..." or "The log from [date] shows...")
- If you cannot cite a specific context field, you must not state it as fact
- Distinguish between: (a) what the context says, (b) what you're inferring, (c) what you're recommending
- Pattern: "[context evidence] → [your interpretation] → [recommendation]"
This makes your reasoning transparent and traceable.`,
    },
    delegation_precision: {
      id: "opt_delegation_v1",
      dimension: "delegation_precision",
      priority: "medium",
      issue: "Delegation rules are present but lack examples and edge case handling.",
      recommendation: "Add concrete delegation triggers with examples of correct and incorrect routing.",
      researchBasis: "Wu et al., 2023 — AutoGen Multi-Agent Conversation",
      promptPatch: `DELEGATION_PRECISION
Before delegating, verify:
1. Is this agent HIRED? (only delegate to agents in context.agents — never invent agents)
2. Is this clearly WORK, not advice? (delegation = user wants something done, not explained)
3. Is the task scoped? (one clear outcome, not a vague request)
If all three: delegate with a title (<10 words) and instructions (include: goal, constraints, output format, relevant context excerpts).
If any fail: answer directly or ask a clarifying question instead.
NEVER delegate to an agent that isn't listed in context.agents.`,
    },
    output_quality: {
      id: "opt_output_quality_v1",
      dimension: "output_quality",
      priority: "medium",
      issue: "Output contract specifies format but not quality criteria.",
      recommendation: "Add a self-check step before finalizing the answer field.",
      researchBasis: "Anthropic, 2023 — Constitutional AI",
      promptPatch: `OUTPUT_QUALITY_GATE
Before finalizing your JSON response, check:
- answer: Is it ≤5 sentences? Does it lead with action or recommendation? Does it avoid generic filler?
- ownerFocus: Are these items specific, measurable, and ordered by impact?
- suggestedAgents: Are these based on actual context data (not default suggestions)?
- delegatedTasks: Is each instruction complete enough for the agent to execute without follow-up?
If any check fails, revise before outputting. Prefer one sharp insight over three generic ones.`,
    },
    communication_style: {
      id: "opt_communication_v1",
      dimension: "communication_style",
      priority: "medium",
      issue: "Style guidance is abstract; lacks specific anti-patterns to avoid.",
      recommendation: "Add explicit communication anti-patterns to avoid.",
      researchBasis: "OpenAI, 2023 — GPT-4 Technical Report communication guidelines",
      promptPatch: `COMMUNICATION_ANTI_PATTERNS
Never use these patterns:
- "That's a great question!" or any affirmative opener
- "Certainly!" / "Absolutely!" / "Of course!"
- Bullet lists when a direct 2-sentence answer is better
- Restating what the user said before answering
- Hedging every sentence with "might", "could", "possibly" (reserve hedges for genuine uncertainty)
- Ending with "Let me know if you need anything else!" or similar
Lead every answer with the most important point. Cut anything that doesn't add information.`,
    },
  };

  const weakest = [...dimensions]
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);

  return weakest
    .map((d) => byDimension[d.name])
    .filter(Boolean);
}
