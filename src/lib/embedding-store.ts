/**
 * Semantic embedding store for RAG over business files.
 * Uses OpenAI text-embedding-3-small (1536 dims) when an API key is available.
 * Falls back gracefully to keyword search if not.
 */
import { prisma } from "@/lib/db";

const EMBEDDING_MODEL = "text-embedding-3-small";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

async function getOpenAIKey(userId: string): Promise<string | null> {
  try {
    const { getProviderApiKeyRuntime } = await import("@/lib/connectors-store");
    const runtime = await getProviderApiKeyRuntime(userId, "OPENAI");
    return runtime.apiKey ?? null;
  } catch {
    return null;
  }
}

/**
 * Embed a single business file. No-op if already embedded with current model or no API key.
 */
export async function embedBusinessFile(userId: string, fileId: string): Promise<void> {
  const file = await prisma.businessFile.findFirst({
    where: { id: fileId, userId },
    select: { id: true, textExtract: true, name: true, embeddingModel: true },
  });
  if (!file || !file.textExtract || file.embeddingModel === EMBEDDING_MODEL) return;

  const apiKey = await getOpenAIKey(userId);
  if (!apiKey) return;

  const text = `${file.name}\n\n${file.textExtract}`.slice(0, 8000);
  const embedding = await generateEmbedding(text, apiKey);
  if (!embedding) return;

  await prisma.businessFile.update({
    where: { id: fileId },
    data: { embeddingJson: JSON.stringify(embedding), embeddingModel: EMBEDDING_MODEL },
  });
}

/**
 * Embed all un-embedded files for a user (lazy batch, max 50).
 */
export async function embedPendingFiles(userId: string, limit = 50): Promise<number> {
  const apiKey = await getOpenAIKey(userId);
  if (!apiKey) return 0;

  const files = await prisma.businessFile.findMany({
    where: { userId, textExtract: { not: null }, embeddingModel: null },
    select: { id: true, textExtract: true, name: true },
    take: limit,
  });

  let count = 0;
  for (const file of files) {
    if (!file.textExtract) continue;
    const text = `${file.name}\n\n${file.textExtract}`.slice(0, 8000);
    const embedding = await generateEmbedding(text, apiKey);
    if (embedding) {
      await prisma.businessFile.update({
        where: { id: file.id },
        data: { embeddingJson: JSON.stringify(embedding), embeddingModel: EMBEDDING_MODEL },
      });
      count++;
    }
  }
  return count;
}

export type SemanticSearchResult = {
  fileId: string;
  name: string;
  category: string;
  similarity: number;
  excerpt: string;
};

/**
 * Semantic search over business files.
 * Generates a query embedding, computes cosine similarity against all embedded files,
 * returns top-k results. Falls back to keyword search if no API key.
 */
export async function semanticSearchFiles(
  userId: string,
  query: string,
  limit = 5,
): Promise<SemanticSearchResult[]> {
  const apiKey = await getOpenAIKey(userId);

  // Lazy-embed any pending files first
  if (apiKey) await embedPendingFiles(userId, 20);

  const files = await prisma.businessFile.findMany({
    where: { userId },
    select: { id: true, name: true, category: true, textExtract: true, embeddingJson: true },
  });

  if (files.length === 0) return [];

  // If we have an API key, use cosine similarity
  if (apiKey) {
    const queryEmbedding = await generateEmbedding(query, apiKey);
    if (queryEmbedding) {
      const scored = files
        .filter((f) => f.embeddingJson)
        .map((f) => {
          const vec = JSON.parse(f.embeddingJson!) as number[];
          return { f, sim: cosineSimilarity(queryEmbedding, vec) };
        })
        .sort((a, b) => b.sim - a.sim)
        .slice(0, limit);

      return scored.map(({ f, sim }) => ({
        fileId: f.id,
        name: f.name,
        category: f.category,
        similarity: Math.round(sim * 100) / 100,
        excerpt: (f.textExtract ?? "").slice(0, 300),
      }));
    }
  }

  // Fallback: keyword search
  const q = query.toLowerCase();
  return files
    .filter((f) => f.name.toLowerCase().includes(q) || (f.textExtract ?? "").toLowerCase().includes(q))
    .slice(0, limit)
    .map((f) => ({
      fileId: f.id,
      name: f.name,
      category: f.category,
      similarity: 0,
      excerpt: (f.textExtract ?? "").slice(0, 300),
    }));
}
