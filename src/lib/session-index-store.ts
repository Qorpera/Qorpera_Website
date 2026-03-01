/**
 * Session transcript indexing and search.
 * Chunks advisor session messages, embeds them, and provides
 * cosine-similarity search with keyword fallback.
 */

import { prisma } from "@/lib/db";
import {
  generateEmbedding,
  cosineSimilarity,
  getOpenAIKeyForUser,
} from "@/lib/embedding-store";
import { tokenize, buildBM25Corpus, scoreAllBM25 } from "@/lib/bm25";

const SESSION_CHUNK_SIZE = 600;

export type SessionSearchResult = {
  sessionId: string;
  chunkText: string;
  similarity: number;
};

/**
 * Incrementally chunk and embed new messages in a session.
 * Uses `lastIndexedMessageId` watermark to avoid re-processing.
 */
export async function indexSessionMessages(
  userId: string,
  sessionId: string,
): Promise<number> {
  try {
    const session = await prisma.advisorSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, lastIndexedMessageId: true },
    });
    if (!session) return 0;

    // Fetch messages after watermark
    const whereClause: Record<string, unknown> = { sessionId };
    if (session.lastIndexedMessageId) {
      const watermarkMsg = await prisma.advisorMessage.findUnique({
        where: { id: session.lastIndexedMessageId },
        select: { createdAt: true },
      });
      if (watermarkMsg) {
        whereClause.createdAt = { gt: watermarkMsg.createdAt };
      }
    }

    const messages = await prisma.advisorMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true },
    });

    if (messages.length === 0) return 0;

    const apiKey = await getOpenAIKeyForUser(userId);

    const rows: Array<{
      sessionId: string;
      userId: string;
      messageId: string;
      chunkIndex: number;
      chunkText: string;
      embeddingJson: string | null;
    }> = [];

    for (const msg of messages) {
      const text = `${msg.role}: ${msg.content}`;
      const chunks = chunkSessionText(text);

      for (let i = 0; i < chunks.length; i++) {
        let embeddingJson: string | null = null;
        if (apiKey) {
          const emb = await generateEmbedding(chunks[i], apiKey);
          if (emb) embeddingJson = JSON.stringify(emb);
        }
        rows.push({
          sessionId,
          userId,
          messageId: msg.id,
          chunkIndex: i,
          chunkText: chunks[i],
          embeddingJson,
        });
      }
    }

    if (rows.length > 0) {
      await prisma.sessionChunk.createMany({ data: rows });
    }

    // Update watermark
    const lastMsg = messages[messages.length - 1];
    await prisma.advisorSession.update({
      where: { id: sessionId },
      data: { lastIndexedMessageId: lastMsg.id },
    });

    return rows.length;
  } catch (err) {
    console.error("[session-index] indexSessionMessages error", String(err));
    return 0;
  }
}

/**
 * Search session transcripts for a user using cosine similarity.
 * Falls back to BM25 keyword scoring when embeddings are unavailable.
 */
export async function searchSessionTranscripts(
  userId: string,
  query: string,
  limit = 5,
): Promise<SessionSearchResult[]> {
  try {
    const chunks = await prisma.sessionChunk.findMany({
      where: { userId },
      select: { sessionId: true, chunkText: true, embeddingJson: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    if (chunks.length === 0) return [];

    const apiKey = await getOpenAIKeyForUser(userId);
    let queryEmbedding: number[] | null = null;
    if (apiKey) {
      queryEmbedding = await generateEmbedding(query.slice(0, 8000), apiKey);
    }

    if (queryEmbedding) {
      // Vector search
      const scored = chunks
        .filter((c) => c.embeddingJson)
        .map((c) => {
          const vec = JSON.parse(c.embeddingJson!) as number[];
          return {
            sessionId: c.sessionId,
            chunkText: c.chunkText,
            similarity: cosineSimilarity(queryEmbedding!, vec),
          };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      if (scored.length > 0) return scored;
    }

    // Fallback: BM25 keyword search
    const queryTerms = tokenize(query);
    const docTexts = chunks.map((c) => c.chunkText);
    const corpus = buildBM25Corpus(docTexts);
    const bm25Scores = scoreAllBM25(queryTerms, corpus);
    const maxBm25 = Math.max(...bm25Scores, 0.001);

    return chunks
      .map((c, i) => ({
        sessionId: c.sessionId,
        chunkText: c.chunkText,
        similarity: bm25Scores[i] / maxBm25,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (err) {
    console.error("[session-index] searchSessionTranscripts error", String(err));
    return [];
  }
}

/** Simple chunking for session text */
function chunkSessionText(text: string): string[] {
  if (!text || text.length === 0) return [];
  if (text.length <= SESSION_CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    chunks.push(text.slice(offset, offset + SESSION_CHUNK_SIZE));
    offset += SESSION_CHUNK_SIZE;
  }
  return chunks.filter((c) => c.length > 0);
}
