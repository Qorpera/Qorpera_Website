/**
 * Analyzes a target agent against research findings and generates typed actions.
 */

import type {
  ResearchFinding,
  ScoreDimension,
  OptimizationAction,
  AgentContext,
} from "./types";
import { SCORE_DIMENSIONS } from "./types";

function extractJson<T>(raw: string): T | null {
  for (const [open, close] of [["{", "}"], ["[", "]"]] as const) {
    const first = raw.indexOf(open);
    const last = raw.lastIndexOf(close);
    if (first !== -1 && last > first) {
      try { return JSON.parse(raw.slice(first, last + 1)) as T; } catch { /* next */ }
    }
  }
  return null;
}

function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

// ── Prompts vary by agent type ───────────────────────────────────

const AGENT_FOCUS: Record<string, string> = {
  CHIEF_ADVISOR:          "strategic reasoning, business grounding, delegation routing, plan-context injection",
  ASSISTANT:              "triage accuracy, task decomposition, handoff clarity, multi-step research",
  SALES_REP:              "ICP scoring, outreach personalization, pipeline logging discipline, objection handling",
  CUSTOMER_SUCCESS:       "churn signal detection, health scoring, renewal prep, escalation triggers",
  MARKETING_COORDINATOR:  "brand voice consistency, campaign analysis rigor, approval discipline, content quality",
  FINANCE_ANALYST:        "numeric accuracy, anomaly thresholds, read-only discipline, report structure",
  OPERATIONS_MANAGER:     "SOP versioning, blocker severity, vendor SLA tracking, cross-team delegation",
  EXECUTIVE_ASSISTANT:    "inbox triage priority tiers, brief format, action item tracking, confidentiality",
  RESEARCH_ANALYST:       "source citation rigor, claim verification, quality review gates, synthesis depth",
};

const AGENT_SYSTEM_PROMPT_SUMMARY: Record<string, string> = {
  CHIEF_ADVISOR: `ROLE: Business Advisor (operator-level). Provides strategy, delegation, hiring recommendations.
KEY SECTIONS: ROLE_IDENTITY, CORE_MANDATE, OPERATING_POLICY, GROUNDING RULES, DELEGATION, AGENT ROUTING TABLE, HIRING, STYLE, OUTPUT_CONTRACT.
Notable: structured JSON output; delegates to specialist agents; anti-hallucination rules; plan context injection.`,

  ASSISTANT: `ROLE: General Support / Triage Rep. Handles research, drafting, CRM notes, inbox triage.
SOUL: coreTruths include execution-orientation, safe progress, escalation; boundaries include no policy invention.
Notable: tool-based execution; delegates to specialists; approval-gated external actions.`,

  SALES_REP: `ROLE: Sales Rep. Handles prospecting, ICP research, outreach drafts, pipeline logging.
SOUL: focuses on lead qualification, personalization, pipeline hygiene.
Notable: no automatic sends; escalates to CS on conversion; audit enrichment quality.`,

  CUSTOMER_SUCCESS: `ROLE: CS Manager. Monitors health, churn risk, renewal prep.
SOUL: focuses on retention, health score interpretation, escalation protocols.
Notable: read-only on CRM; escalates at-risk accounts; renewal briefs require approval.`,

  MARKETING_COORDINATOR: `ROLE: Marketing. Creates content, analyzes campaigns, reviews Figma designs.
SOUL: brand voice adherence, campaign impact metrics, design token extraction.
Notable: nothing publishes without approval; Figma integration for design review.`,

  FINANCE_ANALYST: `ROLE: Finance. Financial analysis, anomaly detection (>20% deviation), structured reports.
SOUL: verification workflow, numeric accuracy, read-only discipline.
Notable: no external actions at all; escalates anomalies; structured table output.`,

  OPERATIONS_MANAGER: `ROLE: Operations. SOP maintenance, vendor SLA, blockers, cross-team delegation.
SOUL: versioned SOPs, vendor tracking, impact assessment.
Notable: delegates cross-team; identifies blockers with business impact.`,

  EXECUTIVE_ASSISTANT: `ROLE: Exec Assistant. Inbox triage (Critical/Today/This Week/FYI), meeting briefs, action items.
SOUL: confidentiality, priority tiers, action tracking with owners/due dates.
Notable: treats all info as confidential; meeting briefs require human review.`,

  RESEARCH_ANALYST: `ROLE: Research Analyst. Web research, source validation, synthesis reports.
SOUL: cite sources for every claim; use quality_review before finalizing; never present unverified claims as facts.
Notable: quality_review tool required; Tavily for web search; structured citations.`,
};

// ── Main entrypoint ──────────────────────────────────────────────

export async function analyzeAgent(
  agentContext: AgentContext,
  research: ResearchFinding[],
  llmCaller: (system: string, user: string) => Promise<string | null>,
): Promise<{
  overallScore: number;
  dimensions: ScoreDimension[];
  actions: OptimizationAction[];
  synthesis: string;
}> {
  const synthesis = await synthesizeResearch(research, agentContext, llmCaller);
  const { overallScore, dimensions } = await scoreAgent(agentContext, synthesis, llmCaller);
  const actions = await generateActions(agentContext, dimensions, synthesis, llmCaller);
  return { overallScore, dimensions, actions, synthesis };
}

async function synthesizeResearch(
  research: ResearchFinding[],
  ctx: AgentContext,
  llmCaller: (s: string, u: string) => Promise<string | null>,
): Promise<string> {
  const researchText = research
    .map((r) => `TECHNIQUE: ${r.technique}\nSOURCE: ${r.source}\nINSIGHTS:\n${r.keyInsights.map((i) => `  - ${i}`).join("\n")}`)
    .join("\n\n");

  const raw = await llmCaller(
    "You synthesize AI research into actionable agent optimization guidance. Be concise and technical.",
    `Synthesize these research findings into 250-word guidance for optimizing the ${ctx.agentName} (${ctx.role}) agent.
Focus on: ${AGENT_FOCUS[ctx.agentKind] ?? "general agent quality"}.

RESEARCH:
${researchText}`,
  ).catch(() => null);

  return raw?.trim() ?? "Research synthesis unavailable.";
}

async function scoreAgent(
  ctx: AgentContext,
  synthesis: string,
  llmCaller: (s: string, u: string) => Promise<string | null>,
): Promise<{ overallScore: number; dimensions: ScoreDimension[] }> {
  const dimensionList = SCORE_DIMENSIONS.map((d) => `- ${d.name} (${d.label})`).join("\n");

  const raw = await llmCaller(
    "You audit AI agent system prompts against research best practices. Return only valid JSON.",
    `Score the ${ctx.agentName} (${ctx.role}) agent on each dimension (0–100).

RESEARCH BEST PRACTICES:
${synthesis}

CURRENT AGENT DESIGN:
${AGENT_SYSTEM_PROMPT_SUMMARY[ctx.agentKind] ?? "Standard agent design."}

CURRENT CONFIG:
- maxLoopIterations: ${ctx.currentConfig.maxLoopIterations}
- maxRuntimeSeconds: ${ctx.currentConfig.maxRuntimeSeconds}
- maxAgentCallsPerRun: ${ctx.currentConfig.maxAgentCallsPerRun}
- requireApprovalForExternalActions: ${ctx.currentConfig.requireApprovalForExternalActions}
- allowAgentDelegation: ${ctx.currentConfig.allowAgentDelegation}

DIMENSIONS:
${dimensionList}

Return JSON (no markdown):
{"overallScore":0-100,"dimensions":[{"name":"...","label":"...","score":0-100,"rationale":"2-3 sentences","evidence":"quote or Not found"}]}`,
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

  return {
    overallScore: 60,
    dimensions: SCORE_DIMENSIONS.map((d) => ({
      name: d.name, label: d.label, score: 60, rationale: "Score estimated.", evidence: "N/A",
    })),
  };
}

async function generateActions(
  ctx: AgentContext,
  dimensions: ScoreDimension[],
  synthesis: string,
  llmCaller: (s: string, u: string) => Promise<string | null>,
): Promise<OptimizationAction[]> {
  const weakest = [...dimensions].sort((a, b) => a.score - b.score).slice(0, 4);
  const weakestText = weakest.map((d) => `${d.name} (${d.score}/100): ${d.rationale}`).join("\n");

  const raw = await llmCaller(
    "You generate typed optimization actions for AI agent system prompts. Return only valid JSON arrays.",
    `Generate 5–6 optimization actions for the ${ctx.agentName} (${ctx.role}) agent.

RESEARCH BEST PRACTICES:
${synthesis}

AGENT FOCUS AREAS: ${AGENT_FOCUS[ctx.agentKind] ?? "general quality"}

WEAKEST DIMENSIONS:
${weakestText}

CURRENT CONFIG:
- maxLoopIterations: ${ctx.currentConfig.maxLoopIterations}
- maxRuntimeSeconds: ${ctx.currentConfig.maxRuntimeSeconds}
- requireApprovalForExternalActions: ${ctx.currentConfig.requireApprovalForExternalActions}

Generate a mix of action types. Return a JSON array (no markdown):
[
  {
    "type": "prompt_patch",
    "id": "opt_<short_id>",
    "priority": "high|medium|low",
    "dimension": "<dimension_name>",
    "issue": "<what is missing — 1 sentence>",
    "researchBasis": "<paper/technique>",
    "sectionHeader": "<SECTION_NAME_IN_CAPS>",
    "content": "<200-word body of the protocol — imperative, specific, examples>"
  },
  {
    "type": "soul_addition",
    "id": "opt_<short_id>",
    "priority": "high|medium|low",
    "field": "coreTruth|boundary",
    "issue": "<what is missing>",
    "researchBasis": "<paper/technique>",
    "content": "<the exact truth or boundary text to add, 1–2 sentences>"
  },
  {
    "type": "automation_config",
    "id": "opt_<short_id>",
    "priority": "medium|low",
    "field": "maxLoopIterations|maxRuntimeSeconds|maxAgentCallsPerRun|requireApprovalForExternalActions|allowAgentDelegation|maxToolRetries",
    "recommendedValue": <number or boolean>,
    "issue": "<why this config value is suboptimal>",
    "researchBasis": "<paper/technique>"
  },
  {
    "type": "memory_seed",
    "id": "opt_<short_id>",
    "priority": "high|medium|low",
    "topic": "<topic slug>",
    "title": "<short title>",
    "content": "<200-word knowledge to inject — specific techniques, patterns, or domain knowledge>",
    "importance": <1-10>,
    "issue": "<what knowledge is currently missing>",
    "researchBasis": "<paper/technique>"
  }
]

Assign priority: HIGH = directly improves quality with high confidence; MEDIUM = useful but needs review; LOW = minor.
Ensure IDs are unique. Make prompt_patch content specific and immediately usable.`
  ).catch(() => null);

  if (raw) {
    const parsed = extractJson<OptimizationAction[]>(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter((a) => a.type && a.id && a.priority)
        .map((a) => ({ ...a, id: a.id || `opt_${shortId()}` }));
    }
  }

  return getFallbackActions(ctx, dimensions);
}

function getFallbackActions(
  ctx: AgentContext,
  dimensions: ScoreDimension[],
): OptimizationAction[] {
  const weakest = [...dimensions].sort((a, b) => a.score - b.score).slice(0, 2);
  const actions: OptimizationAction[] = [];

  if (weakest[0]) {
    actions.push({
      type: "prompt_patch",
      id: `opt_${shortId()}`,
      priority: "high",
      dimension: weakest[0].name,
      issue: `${ctx.agentName} lacks explicit protocol for ${weakest[0].label.toLowerCase()}.`,
      researchBasis: "Wei et al., 2022 — Chain-of-Thought Prompting",
      sectionHeader: `${weakest[0].name.toUpperCase()}_PROTOCOL`,
      content: `Before executing any task, verify:\n1. Is the objective clear? (restate in 1 line)\n2. What context is available? (list relevant data)\n3. What assumptions am I making? (state explicitly)\n4. Is this within my approved scope?\nOnly proceed when all four checks pass.`,
    });
  }

  actions.push({
    type: "soul_addition",
    id: `opt_${shortId()}`,
    priority: "high",
    field: "boundary",
    issue: `${ctx.agentName} needs explicit uncertainty boundary.`,
    researchBasis: "Kadavath et al., 2022 — Language Models Know What They Know",
    content: "When key inputs are missing or conflicting, explicitly state what is unknown and request clarification rather than proceeding with low-confidence assumptions.",
  });

  actions.push({
    type: "memory_seed",
    id: `opt_${shortId()}`,
    priority: "medium",
    topic: "best_practices",
    title: `${ctx.agentName} Quality Standards`,
    content: `Key quality standards for ${ctx.role}: Always cite the specific business context data that informed each recommendation. Express uncertainty using confidence tiers (HIGH/MEDIUM/LOW). Escalate when confidence is LOW. Prefer reversible actions over irreversible ones when unsure.`,
    importance: 8,
    issue: "Agent lacks seeded quality standards in memory.",
    researchBasis: "Anthropic Constitutional AI, 2023",
  });

  return actions;
}
