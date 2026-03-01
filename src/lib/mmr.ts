/**
 * Maximal Marginal Relevance (MMR) re-ranking.
 * Balances relevance with diversity in result sets.
 */

import { tokenize } from "@/lib/bm25";

/** Cosine similarity between two equal-length vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Jaccard overlap between two token sets */
function jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface MMRCandidate<T> {
  item: T;
  /** Pre-computed relevance score (higher = more relevant) */
  score: number;
  /** Optional embedding vector for cosine diversity */
  embedding?: number[];
  /** Text for Jaccard fallback when embedding unavailable */
  text: string;
}

/**
 * Re-rank candidates using Maximal Marginal Relevance.
 *
 * MMR(d) = λ * Rel(d) - (1-λ) * max_{s∈S} Sim(d, s)
 *
 * @param candidates - scored candidates
 * @param limit - max results to return
 * @param lambda - trade-off: 1.0 = pure relevance, 0.0 = pure diversity (default 0.7)
 */
export function mmrRerank<T>(
  candidates: MMRCandidate<T>[],
  limit: number,
  lambda = 0.7,
): T[] {
  if (candidates.length === 0) return [];
  if (candidates.length <= limit) {
    return candidates
      .sort((a, b) => b.score - a.score)
      .map((c) => c.item);
  }

  // Normalize scores to [0, 1]
  const maxScore = Math.max(...candidates.map((c) => c.score));
  const minScore = Math.min(...candidates.map((c) => c.score));
  const scoreRange = maxScore - minScore || 1;
  const normScores = candidates.map(
    (c) => (c.score - minScore) / scoreRange,
  );

  // Pre-tokenize for Jaccard fallback
  const tokenSets = candidates.map((c) => tokenize(c.text));

  const selected: number[] = [];
  const remaining = new Set(candidates.map((_, i) => i));

  for (let k = 0; k < limit && remaining.size > 0; k++) {
    let bestIdx = -1;
    let bestMMR = -Infinity;

    for (const i of remaining) {
      const relevance = normScores[i];

      // Max similarity to already selected items
      let maxSim = 0;
      for (const s of selected) {
        let sim: number;
        if (candidates[i].embedding && candidates[s].embedding) {
          sim = cosineSimilarity(
            candidates[i].embedding!,
            candidates[s].embedding!,
          );
        } else {
          sim = jaccardSimilarity(tokenSets[i], tokenSets[s]);
        }
        if (sim > maxSim) maxSim = sim;
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
      if (mmrScore > bestMMR) {
        bestMMR = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      selected.push(bestIdx);
      remaining.delete(bestIdx);
    }
  }

  return selected.map((i) => candidates[i].item);
}
