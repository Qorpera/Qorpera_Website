import { prisma } from "@/lib/db";

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export async function recordOllamaUsage(
  userId: string,
  usage: { requestCount?: number; promptTokens?: number; completionTokens?: number },
) {
  const monthKey = currentMonthKey();
  await prisma.ollamaUsage.upsert({
    where: { userId_monthKey: { userId, monthKey } },
    update: {
      requestCount: { increment: usage.requestCount ?? 1 },
      promptTokens: { increment: usage.promptTokens ?? 0 },
      completionTokens: { increment: usage.completionTokens ?? 0 },
    },
    create: {
      userId,
      monthKey,
      requestCount: usage.requestCount ?? 1,
      promptTokens: usage.promptTokens ?? 0,
      completionTokens: usage.completionTokens ?? 0,
    },
  });
}

export async function getOllamaUsageThisMonth(userId: string) {
  const monthKey = currentMonthKey();
  const row = await prisma.ollamaUsage.findUnique({
    where: { userId_monthKey: { userId, monthKey } },
  });
  return {
    requestCount: row?.requestCount ?? 0,
    promptTokens: row?.promptTokens ?? 0,
    completionTokens: row?.completionTokens ?? 0,
  };
}

// Pricing per 1M tokens (input / output) for newest flagship models as of early 2026
export const CLOUD_PRICING = [
  { label: "Gemini 3",          inputPer1M: 0.50,  outputPer1M: 2.00  },
  { label: "GPT 5.2",           inputPer1M: 5.00,  outputPer1M: 20.00 },
  { label: "Claude Sonnet 4.6", inputPer1M: 3.00,  outputPer1M: 15.00 },
  { label: "Claude Opus 4.6",   inputPer1M: 15.00, outputPer1M: 75.00 },
] as const;

export function estimateCloudCost(
  promptTokens: number,
  completionTokens: number,
  pricing: (typeof CLOUD_PRICING)[number],
) {
  return (
    (promptTokens / 1_000_000) * pricing.inputPer1M +
    (completionTokens / 1_000_000) * pricing.outputPer1M
  );
}
