/**
 * Deep agent memory system (v2).
 *
 * Replaces the shallow 30-entry / 300-char memory with:
 * - Up to 500 entries per agent, 2000 chars each
 * - Category, tag, and importance-based organization
 * - Hybrid retrieval: BM25 + vector cosine + decay + importance with MMR diversity re-ranking
 * - Decay scoring: score = importance × 0.95^days × (1 + 0.1×accessCount)
 * - Automatic compaction: prune entries with decayScore < 0.5 AND importance ≤ 3 AND age > 30d
 * - Fire-and-forget embedding on new entries; lazy backfill for old entries
 */

import { prisma } from "@/lib/db";
import { inferCategory, type MemoryCategory } from "@/lib/memory-categories";
import { tokenize, buildBM25Corpus, scoreAllBM25 } from "@/lib/bm25";
import { mmrRerank, type MMRCandidate } from "@/lib/mmr";
import { cosineSimilarity, generateEmbedding, getOpenAIKeyForUser } from "@/lib/embedding-store";

const DEFAULT_MAX_ENTRIES = 500;
const MAX_CONTENT_CHARS = 2000;
const MAX_INDEX_CHARS = 12000;
const DECAY_RATE = 0.95;
const ACCESS_BOOST = 0.1;
const PRUNE_DECAY_THRESHOLD = 0.5;
const PRUNE_IMPORTANCE_MAX = 3;
const PRUNE_AGE_DAYS = 30;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemoryEntryInput = {
  topic: string;
  title: string;
  content: string;
  importance: number;
  category?: MemoryCategory;
  tags?: string;
  sourceTaskId?: string;
};

export type RelevantMemory = {
  id: string;
  topic: string;
  title: string;
  content: string;
  importance: number;
  category: string;
  relevanceScore: number;
};

// ---------------------------------------------------------------------------
// Core: append
// ---------------------------------------------------------------------------

export async function appendMemoryEntry(
  userId: string,
  agentKind: string,
  entry: MemoryEntryInput,
): Promise<void> {
  const mem = await prisma.agentMemory.upsert({
    where: { userId_agentKind: { userId, agentKind } },
    create: { userId, agentKind, indexContent: "", entryCount: 0, maxEntries: DEFAULT_MAX_ENTRIES, totalTokens: 0 },
    update: {},
    select: { id: true, maxEntries: true },
  });

  const category = entry.category ?? inferCategory(entry.topic, entry.content);
  const tags = entry.tags ?? "";

  const row = await prisma.agentMemoryEntry.create({
    data: {
      agentMemoryId: mem.id,
      topic: entry.topic.slice(0, 80),
      title: entry.title.slice(0, 120),
      content: entry.content.slice(0, MAX_CONTENT_CHARS),
      importance: Math.max(1, Math.min(10, entry.importance)),
      category,
      tags: tags.slice(0, 200),
      sourceTaskId: entry.sourceTaskId ?? null,
      decayScore: entry.importance,
    },
  });

  // Fire-and-forget: generate embedding for the new entry
  embedMemoryEntry(userId, row.id, `${entry.topic} ${entry.title} ${entry.content}`).catch(() => {});

  // Atomic increment — only the caller whose increment crosses the threshold compacts.
  const updated = await prisma.agentMemory.update({
    where: { id: mem.id },
    data: {
      entryCount: { increment: 1 },
      totalTokens: { increment: Math.ceil(entry.content.length / 4) },
    },
    select: { entryCount: true, maxEntries: true },
  });

  const maxEntries = updated.maxEntries ?? DEFAULT_MAX_ENTRIES;
  if (updated.entryCount >= maxEntries) {
    compactMemory(mem.id).catch((err) => {
      console.error("[memory-v2] compactMemory error", err);
    });
  }
}

/** Generate and store embedding for a single memory entry */
async function embedMemoryEntry(userId: string, entryId: string, text: string): Promise<void> {
  const apiKey = await getOpenAIKeyForUser(userId);
  if (!apiKey) return;
  const embedding = await generateEmbedding(text.slice(0, 8000), apiKey);
  if (!embedding) return;
  await prisma.agentMemoryEntry.update({
    where: { id: entryId },
    data: { embeddingJson: JSON.stringify(embedding) },
  });
}

// ---------------------------------------------------------------------------
// Relevance-based retrieval
// ---------------------------------------------------------------------------

/**
 * Get memories most relevant to a given task context.
 * Hybrid pipeline: BM25 + vector cosine + decay + importance, then MMR diversity re-ranking.
 * Gracefully degrades: no API key → BM25-only; no embedding → per-entry fallback weights.
 */
export async function getRelevantMemories(
  userId: string,
  agentKind: string,
  context: { taskTitle?: string; taskInstructions?: string },
  limit = 20,
): Promise<string> {
  const mem = await prisma.agentMemory.findUnique({
    where: { userId_agentKind: { userId, agentKind } },
    select: { id: true },
  });
  if (!mem) return "";

  const entries = await prisma.agentMemoryEntry.findMany({
    where: { agentMemoryId: mem.id },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });

  if (entries.length === 0) return "";

  const contextText = `${context.taskTitle ?? ""} ${context.taskInstructions ?? ""}`;
  const queryTerms = tokenize(contextText);

  // 1. BM25 scoring
  const docTexts = entries.map((e) => `${e.topic} ${e.title} ${e.content}`);
  const corpus = buildBM25Corpus(docTexts);
  const bm25Scores = scoreAllBM25(queryTerms, corpus);

  // Normalize BM25 scores to [0, 1]
  const maxBm25 = Math.max(...bm25Scores, 0.001);
  const normBm25 = bm25Scores.map((s) => s / maxBm25);

  // 2. Vector scoring (for entries that have embeddings)
  let queryEmbedding: number[] | null = null;
  const apiKey = await getOpenAIKeyForUser(userId);
  if (apiKey && queryTerms.length > 0) {
    queryEmbedding = await generateEmbedding(contextText.slice(0, 8000), apiKey);
  }

  const vectorScores: (number | null)[] = entries.map((e) => {
    if (!queryEmbedding || !e.embeddingJson) return null;
    try {
      const vec = JSON.parse(e.embeddingJson) as number[];
      return cosineSimilarity(queryEmbedding, vec);
    } catch {
      return null;
    }
  });

  // 3. Hybrid scoring
  const scored = entries.map((e, i) => {
    const decay = computeDecayScore(e.importance, e.createdAt, e.accessCount ?? 0);
    const normDecay = Math.min(decay / 10, 1); // normalize: max importance=10
    const normImportance = e.importance / 10;

    const vecScore = vectorScores[i];
    let hybridScore: number;
    if (vecScore !== null) {
      // Full hybrid: 0.35*BM25 + 0.35*vector + 0.15*decay + 0.15*importance
      hybridScore = 0.35 * normBm25[i] + 0.35 * vecScore + 0.15 * normDecay + 0.15 * normImportance;
    } else {
      // No embedding fallback: 0.55*BM25 + 0.25*decay + 0.20*importance
      hybridScore = 0.55 * normBm25[i] + 0.25 * normDecay + 0.20 * normImportance;
    }

    return { entry: e, hybridScore, embedding: vecScore !== null ? (JSON.parse(e.embeddingJson!) as number[]) : undefined };
  });

  scored.sort((a, b) => b.hybridScore - a.hybridScore);

  // 4. Take top 60 candidates → MMR re-rank → return top `limit`
  const MMR_POOL = 60;
  const pool = scored.slice(0, MMR_POOL);

  const candidates: MMRCandidate<typeof pool[0]>[] = pool.map((s) => ({
    item: s,
    score: s.hybridScore,
    embedding: s.embedding,
    text: `${s.entry.topic} ${s.entry.title} ${s.entry.content}`,
  }));

  const reranked = mmrRerank(candidates, limit, 0.7);

  if (reranked.length === 0) return "";

  // Lazy backfill: if >30% of fetched entries lack embeddings, backfill 10 in background
  const withoutEmbedding = entries.filter((e) => !e.embeddingJson).length;
  if (withoutEmbedding / entries.length > 0.3) {
    backfillMemoryEmbeddings(userId, agentKind, 10).catch(() => {});
  }

  // Update access counts for retrieved memories (fire-and-forget)
  const ids = reranked.map((s) => s.entry.id);
  prisma.agentMemoryEntry.updateMany({
    where: { id: { in: ids } },
    data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
  }).catch(() => {});

  // Format for prompt injection
  let output = "## AGENT MEMORY\n";
  for (const s of reranked) {
    const e = s.entry;
    const catLabel = e.category !== "general" ? ` [${e.category}]` : "";
    const tagsLabel = e.tags ? ` #${e.tags.split(",").map((t: string) => t.trim()).filter(Boolean).join(" #")}` : "";
    const line = `[${e.topic}]${catLabel}${tagsLabel} ${e.title} → ${e.content}`;
    output += line + "\n";
    if (output.length >= MAX_INDEX_CHARS) break;
  }
  return output.slice(0, MAX_INDEX_CHARS);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchMemory(
  userId: string,
  agentKind: string,
  opts: { query?: string; category?: string; limit?: number },
): Promise<RelevantMemory[]> {
  const mem = await prisma.agentMemory.findUnique({
    where: { userId_agentKind: { userId, agentKind } },
    select: { id: true },
  });
  if (!mem) return [];

  const where: Record<string, unknown> = { agentMemoryId: mem.id };
  if (opts.category) where.category = opts.category;

  const entries = await prisma.agentMemoryEntry.findMany({
    where,
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  const queryText = opts.query ?? "";
  const queryTerms = tokenize(queryText);
  const docTexts = entries.map((e) => `${e.topic} ${e.title} ${e.content}`);
  const corpus = buildBM25Corpus(docTexts);
  const bm25Scores = scoreAllBM25(queryTerms, corpus);
  const maxBm25 = Math.max(...bm25Scores, 0.001);

  const scored = entries.map((e, i) => {
    const normBm25 = bm25Scores[i] / maxBm25;
    const decayScore = computeDecayScore(e.importance, e.createdAt, e.accessCount ?? 0);
    return {
      id: e.id,
      topic: e.topic,
      title: e.title,
      content: e.content,
      importance: e.importance,
      category: e.category ?? "general",
      relevanceScore: normBm25 * 5 + decayScore * 0.3,
    };
  });

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return scored.slice(0, opts.limit ?? 20);
}

// ---------------------------------------------------------------------------
// Decay scoring
// ---------------------------------------------------------------------------

function computeDecayScore(importance: number, createdAt: Date, accessCount: number): number {
  const ageDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return importance * Math.pow(DECAY_RATE, ageDays) * (1 + ACCESS_BOOST * accessCount);
}

export async function runMemoryDecay(agentMemoryId: string): Promise<number> {
  const entries = await prisma.agentMemoryEntry.findMany({
    where: { agentMemoryId },
    select: { id: true, importance: true, createdAt: true, accessCount: true },
  });

  let updated = 0;
  for (const e of entries) {
    const newScore = computeDecayScore(e.importance, e.createdAt, e.accessCount ?? 0);
    await prisma.agentMemoryEntry.update({
      where: { id: e.id },
      data: { decayScore: Math.round(newScore * 1000) / 1000 },
    });
    updated++;
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Compaction
// ---------------------------------------------------------------------------

export async function compactMemory(agentMemoryId: string): Promise<{ pruned: number; kept: number }> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - PRUNE_AGE_DAYS * 24 * 60 * 60 * 1000);

  // First update decay scores
  await runMemoryDecay(agentMemoryId);

  const entries = await prisma.agentMemoryEntry.findMany({
    where: { agentMemoryId },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
  });

  const mem = await prisma.agentMemory.findUnique({
    where: { id: agentMemoryId },
    select: { maxEntries: true },
  });
  const maxEntries = mem?.maxEntries ?? DEFAULT_MAX_ENTRIES;

  // Identify entries to prune: low decay + low importance + old enough
  const toPrune: string[] = [];
  const toKeep: typeof entries = [];

  for (const e of entries) {
    const decay = e.decayScore ?? computeDecayScore(e.importance, e.createdAt, e.accessCount ?? 0);
    if (
      decay < PRUNE_DECAY_THRESHOLD &&
      e.importance <= PRUNE_IMPORTANCE_MAX &&
      e.createdAt < cutoff
    ) {
      toPrune.push(e.id);
    } else {
      toKeep.push(e);
    }
  }

  // If still over max after pruning low-quality, trim the lowest-scored remaining
  if (toKeep.length > maxEntries) {
    const excess = toKeep.splice(maxEntries);
    toPrune.push(...excess.map((e) => e.id));
  }

  if (toPrune.length > 0) {
    await prisma.agentMemoryEntry.deleteMany({
      where: { id: { in: toPrune } },
    });
  }

  // Rebuild index string
  let indexContent = "## AGENT MEMORY\n";
  for (const e of toKeep.slice(0, 50)) {
    const catLabel = (e.category ?? "general") !== "general" ? ` [${e.category}]` : "";
    const line = `[${e.topic}]${catLabel} ${e.title} → ${e.content}`;
    indexContent += line + "\n";
    if (indexContent.length >= MAX_INDEX_CHARS) break;
  }
  indexContent = indexContent.slice(0, MAX_INDEX_CHARS);

  const totalTokens = toKeep.reduce((sum, e) => sum + Math.ceil(e.content.length / 4), 0);

  await prisma.agentMemory.update({
    where: { id: agentMemoryId },
    data: {
      indexContent,
      entryCount: toKeep.length,
      totalTokens,
      lastCompactedAt: now,
    },
  });

  return { pruned: toPrune.length, kept: toKeep.length };
}

// ---------------------------------------------------------------------------
// Lazy backfill: embed old entries that lack embeddings
// ---------------------------------------------------------------------------

export async function backfillMemoryEmbeddings(
  userId: string,
  agentKind: string,
  batchSize = 30,
): Promise<number> {
  const apiKey = await getOpenAIKeyForUser(userId);
  if (!apiKey) return 0;

  const mem = await prisma.agentMemory.findUnique({
    where: { userId_agentKind: { userId, agentKind } },
    select: { id: true },
  });
  if (!mem) return 0;

  const entries = await prisma.agentMemoryEntry.findMany({
    where: { agentMemoryId: mem.id, embeddingJson: null },
    select: { id: true, topic: true, title: true, content: true },
    take: batchSize,
    orderBy: { importance: "desc" },
  });

  let count = 0;
  for (const e of entries) {
    const text = `${e.topic} ${e.title} ${e.content}`.slice(0, 8000);
    const embedding = await generateEmbedding(text, apiKey);
    if (embedding) {
      await prisma.agentMemoryEntry.update({
        where: { id: e.id },
        data: { embeddingJson: JSON.stringify(embedding) },
      });
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Legacy compat: getAgentMemoryIndex delegates to relevance retrieval
// ---------------------------------------------------------------------------

export async function getAgentMemoryIndex(userId: string, agentKind: string): Promise<string> {
  const mem = await prisma.agentMemory.findUnique({
    where: { userId_agentKind: { userId, agentKind } },
    select: { indexContent: true },
  });
  return mem?.indexContent ?? "";
}

// ---------------------------------------------------------------------------
// Ingestion helpers (same interface as v1 for compatibility)
// ---------------------------------------------------------------------------

export async function ingestSubmissionFeedback(
  userId: string,
  agentKind: string,
  sub: { status: string; rating?: number | null; correction?: string | null; notes?: string | null },
): Promise<void> {
  if (sub.status === "ACCEPTED" && (sub.rating ?? 0) >= 4) {
    await appendMemoryEntry(userId, agentKind, {
      topic: "submission-feedback",
      title: "Submission accepted with high rating",
      content: sub.notes ? `Notes: ${sub.notes.slice(0, 1800)}` : "Output met user expectations.",
      importance: 3,
      category: "feedback",
    });
  } else if (sub.status === "NEEDS_REVISION") {
    const parts: string[] = [];
    if (sub.correction) parts.push(`Correction: ${sub.correction.slice(0, 900)}`);
    if (sub.notes) parts.push(`Notes: ${sub.notes.slice(0, 800)}`);
    await appendMemoryEntry(userId, agentKind, {
      topic: "submission-feedback",
      title: "User requested revision",
      content: parts.join(" | ").slice(0, MAX_CONTENT_CHARS) || "Output needed revision.",
      importance: 8,
      category: "feedback",
    });
  }
}

export async function ingestTaskCompletion(
  userId: string,
  agentKind: string,
  digest: string,
  sourceTaskId?: string,
): Promise<void> {
  await appendMemoryEntry(userId, agentKind, {
    topic: "task-outcome",
    title: "Task completed",
    content: digest.slice(0, MAX_CONTENT_CHARS),
    importance: 4,
    category: "task_outcome",
    sourceTaskId,
  });
}
