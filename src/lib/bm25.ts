/**
 * BM25 (Okapi BM25) scoring for text retrieval.
 * Builds a corpus from documents and scores queries against them.
 */

const STOPWORDS = new Set([
  "the", "is", "at", "which", "on", "a", "an", "and", "or", "but",
  "in", "with", "to", "for", "of", "not", "no", "can", "had", "has",
  "have", "it", "its", "was", "were", "will", "be", "been", "being",
  "do", "does", "did", "from", "are", "this", "that", "these", "those",
  "by", "as", "if", "so", "than", "too", "very", "just", "about",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "each", "every",
  "both", "few", "more", "most", "other", "some", "such", "only",
  "own", "same", "also", "would", "should", "could", "shall", "may",
  "might", "must", "need", "what", "who", "whom", "they", "them",
  "their", "he", "she", "him", "her", "his", "we", "our", "you",
  "your",
]);

/** Lowercase, split on non-alphanumeric, filter stopwords and short tokens */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export interface BM25Corpus {
  /** Number of documents */
  docCount: number;
  /** Average document length in tokens */
  avgDocLength: number;
  /** IDF per term: log((N - df + 0.5) / (df + 0.5) + 1) */
  idf: Map<string, number>;
  /** Per-document token frequency maps and lengths */
  docs: Array<{ tf: Map<string, number>; length: number }>;
}

/**
 * Build a BM25 corpus from a list of text documents.
 * Pre-computes IDF and per-document term frequencies.
 */
export function buildBM25Corpus(documents: string[]): BM25Corpus {
  const N = documents.length;
  if (N === 0) {
    return { docCount: 0, avgDocLength: 0, idf: new Map(), docs: [] };
  }

  const docFreq = new Map<string, number>();
  const docs: BM25Corpus["docs"] = [];
  let totalLength = 0;

  for (const doc of documents) {
    const tokens = tokenize(doc);
    const tf = new Map<string, number>();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
    }
    // count unique terms for doc frequency
    for (const term of tf.keys()) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
    docs.push({ tf, length: tokens.length });
    totalLength += tokens.length;
  }

  const avgDocLength = totalLength / N;
  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
  }

  return { docCount: N, avgDocLength, idf, docs };
}

/**
 * Score a single document (by index) against query terms using Okapi BM25.
 * @param queryTerms - tokenized query
 * @param docIndex - index into corpus.docs
 * @param corpus - pre-built corpus
 * @param k1 - term saturation parameter (default 1.5)
 * @param b - length normalization (default 0.75)
 */
export function scoreBM25(
  queryTerms: string[],
  docIndex: number,
  corpus: BM25Corpus,
  k1 = 1.5,
  b = 0.75,
): number {
  const doc = corpus.docs[docIndex];
  if (!doc) return 0;

  let score = 0;
  for (const term of queryTerms) {
    const idf = corpus.idf.get(term) ?? 0;
    const tf = doc.tf.get(term) ?? 0;
    if (tf === 0) continue;

    const numerator = tf * (k1 + 1);
    const denominator =
      tf + k1 * (1 - b + b * (doc.length / corpus.avgDocLength));
    score += idf * (numerator / denominator);
  }

  return score;
}

/**
 * Score all documents in a corpus and return scores array (same order as docs).
 */
export function scoreAllBM25(
  queryTerms: string[],
  corpus: BM25Corpus,
): number[] {
  const scores: number[] = [];
  for (let i = 0; i < corpus.docCount; i++) {
    scores.push(scoreBM25(queryTerms, i, corpus));
  }
  return scores;
}
