import type { CompanySoulProfile } from "@/lib/company-soul-store";
import type { CatalogSkill } from "@/lib/skills-store";

export type SkillRecommendation = {
  skill: CatalogSkill;
  score: number;
  reason: string;
  matchedTerms: string[];
};

type KeywordMapping = {
  keywords: string[];
  skills: string[];
  reason: (term: string) => string;
};

const TOOL_KEYWORD_MAPS: KeywordMapping[] = [
  {
    keywords: ["figma"],
    skills: ["figma", "figma-implement-design", "figma-design"],
    reason: (t) => `You use ${t}`,
  },
  {
    keywords: ["sentry"],
    skills: ["sentry"],
    reason: (t) => `You use ${t}`,
  },
  {
    keywords: ["github", "gh", "git"],
    skills: ["gh-address-comments", "gh-fix-ci", "yeet"],
    reason: (t) => `You use ${t}`,
  },
  {
    keywords: ["notion"],
    skills: ["notion-knowledge-capture", "notion-meeting-intelligence", "notion-research-documentation", "notion-spec-to-implementation"],
    reason: (t) => `You use ${t}`,
  },
  {
    keywords: ["linear"],
    skills: ["linear"],
    reason: (t) => `You use ${t}`,
  },
  {
    keywords: ["vercel"],
    skills: ["vercel-deploy"],
    reason: (t) => `You deploy on ${t}`,
  },
  {
    keywords: ["netlify"],
    skills: ["netlify-deploy"],
    reason: (t) => `You deploy on ${t}`,
  },
  {
    keywords: ["cloudflare"],
    skills: ["cloudflare-deploy"],
    reason: (t) => `You deploy on ${t}`,
  },
  {
    keywords: ["render"],
    skills: ["render-deploy"],
    reason: (t) => `You deploy on ${t}`,
  },
  {
    keywords: ["openai"],
    skills: ["imagegen", "sora", "speech", "transcribe"],
    reason: () => "You use OpenAI services",
  },
  {
    keywords: ["playwright"],
    skills: ["playwright", "webapp-testing"],
    reason: () => "You use Playwright",
  },
  {
    keywords: ["jupyter", "notebook"],
    skills: ["jupyter-notebook"],
    reason: () => "You use Jupyter notebooks",
  },
  {
    keywords: ["email", "resend", "sendgrid", "postmark"],
    skills: ["connector-email"],
    reason: () => "You send emails",
  },
  {
    keywords: ["webhook", "zapier", "make", "n8n"],
    skills: ["connector-webhook"],
    reason: () => "You use webhooks or automation",
  },
];

const DEPARTMENT_KEYWORD_MAPS: KeywordMapping[] = [
  {
    keywords: ["design", "ui", "ux"],
    skills: ["figma", "figma-implement-design", "figma-design", "frontend-design"],
    reason: () => "Your design team can use this",
  },
  {
    keywords: ["engineering", "development", "dev", "software"],
    skills: ["gh-address-comments", "gh-fix-ci", "playwright", "security-best-practices", "webapp-testing", "yeet"],
    reason: () => "Your engineering team can use this",
  },
  {
    keywords: ["marketing", "content", "brand"],
    skills: ["imagegen", "sora", "internal-comms", "doc-coauthoring"],
    reason: () => "Your marketing team can use this",
  },
  {
    keywords: ["support", "customer success", "cs", "help desk"],
    skills: ["connector-email"],
    reason: () => "Your support team can use this",
  },
  {
    keywords: ["security", "infosec", "compliance"],
    skills: ["security-best-practices", "security-ownership-map", "security-threat-model"],
    reason: () => "Your security team can use this",
  },
  {
    keywords: ["sales", "revenue", "bizdev"],
    skills: ["connector-email", "doc-coauthoring", "internal-comms"],
    reason: () => "Your sales team can use this",
  },
  {
    keywords: ["ops", "operations", "logistics"],
    skills: ["spreadsheet", "xlsx", "connector-webhook"],
    reason: () => "Your ops team can use this",
  },
  {
    keywords: ["legal", "contract"],
    skills: ["doc", "pdf", "doc-coauthoring"],
    reason: () => "Your legal team can use this",
  },
  {
    keywords: ["finance", "accounting"],
    skills: ["spreadsheet", "xlsx"],
    reason: () => "Your finance team can use this",
  },
];

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function matchKeywords(
  text: string,
  maps: KeywordMapping[],
  scores: Map<string, { score: number; reasons: Set<string>; terms: Set<string> }>,
  weight: number,
) {
  const normalized = normalizeText(text);
  for (const mapping of maps) {
    for (const keyword of mapping.keywords) {
      if (!normalized.includes(keyword)) continue;
      for (const skillName of mapping.skills) {
        const existing = scores.get(skillName) ?? { score: 0, reasons: new Set(), terms: new Set() };
        existing.score += weight;
        existing.reasons.add(mapping.reason(keyword));
        existing.terms.add(keyword);
        scores.set(skillName, existing);
      }
    }
  }
}

export function recommendSkills(
  soul: CompanySoulProfile,
  catalog: CatalogSkill[],
): SkillRecommendation[] {
  const scores = new Map<string, { score: number; reasons: Set<string>; terms: Set<string> }>();

  // Match toolsAndSystems (highest weight)
  matchKeywords(soul.toolsAndSystems, TOOL_KEYWORD_MAPS, scores, 3);

  // Match departments
  matchKeywords(soul.departments, DEPARTMENT_KEYWORD_MAPS, scores, 2);

  // Also check other fields with lower weight for tool mentions
  const otherText = [
    soul.coreOffers,
    soul.strategicGoals,
    soul.constraints,
    soul.notesForAgents,
  ].join(" ");
  matchKeywords(otherText, TOOL_KEYWORD_MAPS, scores, 1);

  const catalogMap = new Map(catalog.map((c) => [c.name, c]));
  const results: SkillRecommendation[] = [];

  for (const [skillName, data] of scores) {
    const skill = catalogMap.get(skillName);
    if (!skill) continue;
    results.push({
      skill,
      score: data.score,
      reason: [...data.reasons][0] ?? "Recommended for your setup",
      matchedTerms: [...data.terms],
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
