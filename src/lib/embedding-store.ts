/**
 * Semantic embedding store for RAG over business files.
 * Uses OpenAI text-embedding-3-small (1536 dims) when an API key is available.
 * Falls back gracefully to keyword search if not.
 */
import { prisma } from "@/lib/db";

const EMBEDDING_MODEL = "text-embedding-3-small";
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
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

export async function getOpenAIKeyForUser(userId: string): Promise<string | null> {
  try {
    const { getProviderApiKeyRuntime } = await import("@/lib/connectors-store");
    const runtime = await getProviderApiKeyRuntime(userId, "OPENAI");
    return runtime.apiKey ?? null;
  } catch {
    return null;
  }
}

/**
 * Split text into overlapping chunks on sentence/paragraph boundaries.
 */
export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (!text || text.length === 0) return [];
  if (text.length <= chunkSize) return [text];

  // Split on paragraph breaks first, then sentences, then words
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const sentences = para.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if (current.length + sentence.length + 1 <= chunkSize) {
        current = current ? `${current} ${sentence}` : sentence;
      } else {
        if (current) {
          chunks.push(current.trim());
          // Keep the overlap tail for context continuity
          const words = current.split(/\s+/);
          const overlapWords: string[] = [];
          let overlapLen = 0;
          for (let i = words.length - 1; i >= 0; i--) {
            overlapLen += words[i].length + 1;
            if (overlapLen > overlap) break;
            overlapWords.unshift(words[i]);
          }
          current = overlapWords.length > 0 ? `${overlapWords.join(" ")} ${sentence}` : sentence;
        } else {
          // sentence longer than chunkSize — hard-split it
          let remaining = sentence;
          while (remaining.length > chunkSize) {
            chunks.push(remaining.slice(0, chunkSize).trim());
            remaining = remaining.slice(chunkSize - overlap);
          }
          current = remaining;
        }
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}

/**
 * Chunk a business file and embed each chunk.
 * Skips if chunks already exist for this file. Silent no-op if no API key or no text.
 */
export async function chunkAndEmbedFile(userId: string, fileId: string): Promise<void> {
  try {
    const file = await prisma.businessFile.findFirst({
      where: { id: fileId, userId },
      select: { id: true, textExtract: true, name: true, embeddingModel: true },
    });
    if (!file || !file.textExtract) return;

    // Skip if already chunked
    const existingCount = await prisma.documentChunk.count({ where: { fileId } });
    if (existingCount > 0) return;

    const apiKey = await getOpenAIKeyForUser(userId);
    if (!apiKey) return;

    const fullText = `${file.name}\n\n${file.textExtract}`;
    const chunks = chunkText(fullText);
    if (chunks.length === 0) return;

    // Embed chunks sequentially to avoid rate limits
    const rows: Array<{ fileId: string; userId: string; chunkIndex: number; chunkText: string; embeddingJson: string | null }> = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i], apiKey);
      rows.push({
        fileId,
        userId,
        chunkIndex: i,
        chunkText: chunks[i],
        embeddingJson: embedding ? JSON.stringify(embedding) : null,
      });
    }

    await prisma.documentChunk.createMany({ data: rows });

    // Update whole-doc embedding for backward compat (use first ~8000 chars)
    const docEmbedding = await generateEmbedding(fullText.slice(0, 8000), apiKey);
    if (docEmbedding) {
      await prisma.businessFile.update({
        where: { id: fileId },
        data: { embeddingJson: JSON.stringify(docEmbedding), embeddingModel: EMBEDDING_MODEL },
      });
    }
  } catch (err) {
    console.error("[embed] chunkAndEmbedFile error", { fileId, err: String(err) });
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

  const apiKey = await getOpenAIKeyForUser(userId);
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
  const apiKey = await getOpenAIKeyForUser(userId);
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
 * Semantic search over business file chunks.
 * Generates a query embedding, computes cosine similarity against all stored chunks,
 * keeps the best-matching chunk per file, returns top-k results.
 * Falls back to keyword search if no API key.
 */
export async function semanticSearchFiles(
  userId: string,
  query: string,
  limit = 5,
): Promise<SemanticSearchResult[]> {
  const apiKey = await getOpenAIKeyForUser(userId);

  if (apiKey) {
    const queryEmbedding = await generateEmbedding(query, apiKey);
    if (queryEmbedding) {
      // Fetch all chunks for the user that have embeddings
      const chunks = await prisma.documentChunk.findMany({
        where: { userId, embeddingJson: { not: null } },
        select: {
          fileId: true,
          chunkText: true,
          embeddingJson: true,
          file: { select: { name: true, category: true } },
        },
      });

      if (chunks.length > 0) {
        // Score each chunk
        type ChunkScore = { fileId: string; name: string; category: string; sim: number; chunkText: string };
        const scored: ChunkScore[] = chunks.map((c) => {
          const vec = JSON.parse(c.embeddingJson!) as number[];
          return {
            fileId: c.fileId,
            name: c.file.name,
            category: c.file.category,
            sim: cosineSimilarity(queryEmbedding, vec),
            chunkText: c.chunkText,
          };
        });

        // Keep best chunk per file
        const bestByFile = new Map<string, ChunkScore>();
        for (const item of scored) {
          const existing = bestByFile.get(item.fileId);
          if (!existing || item.sim > existing.sim) {
            bestByFile.set(item.fileId, item);
          }
        }

        const results = Array.from(bestByFile.values())
          .sort((a, b) => b.sim - a.sim)
          .slice(0, limit);

        return results.map(({ fileId, name, category, sim, chunkText }) => ({
          fileId,
          name,
          category,
          similarity: Math.round(sim * 100) / 100,
          excerpt: chunkText.slice(0, 800),
        }));
      }

      // No chunks yet — fall back to whole-file embeddings (backward compat)
      // Lazy-embed any pending files first
      await embedPendingFiles(userId, 20);

      const files = await prisma.businessFile.findMany({
        where: { userId },
        select: { id: true, name: true, category: true, textExtract: true, embeddingJson: true },
      });

      if (files.length > 0) {
        const scored = files
          .filter((f) => f.embeddingJson)
          .map((f) => {
            const vec = JSON.parse(f.embeddingJson!) as number[];
            return { f, sim: cosineSimilarity(queryEmbedding, vec) };
          })
          .sort((a, b) => b.sim - a.sim)
          .slice(0, limit);

        if (scored.length > 0) {
          return scored.map(({ f, sim }) => ({
            fileId: f.id,
            name: f.name,
            category: f.category,
            similarity: Math.round(sim * 100) / 100,
            excerpt: (f.textExtract ?? "").slice(0, 800),
          }));
        }
        // All files exist but none have embeddings yet — fall through to keyword
      }
    }
  }

  // Fallback: keyword search
  const files = await prisma.businessFile.findMany({
    where: { userId },
    select: { id: true, name: true, category: true, textExtract: true },
  });
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
