import type { SearchResult } from '../vector-store/types';
import type { AsyncReranker, CohereRerankerConfig, RerankerConfig, ScoredResult } from './types';

const COHERE_RERANK_URL = 'https://api.cohere.com/v1/rerank';

/**
 * Reranker cross-encoder utilisant l'API Cohere Rerank.
 * Contrairement au HybridReranker (bi-encoder), le cross-encoder
 * évalue la pertinence query/document conjointement pour une meilleure précision.
 *
 * En cas d'échec de l'API, fallback automatique sur l'ordre sémantique Qdrant.
 *
 * @example
 * ```typescript
 * const reranker = new CohereReranker({ apiKey: process.env.COHERE_API_KEY! });
 * const reranked = await reranker.rerank(results, question);
 * ```
 */
export class CohereReranker implements AsyncReranker {
  readonly isAsync = true as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly topN: number;

  constructor(config: CohereRerankerConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'rerank-multilingual-v3.0';
    this.topN = config.topN ?? 3;
  }

  async rerank(
    results: SearchResult[],
    query: string,
    _config?: RerankerConfig
  ): Promise<ScoredResult[]> {
    try {
      if (results.length === 0) return [];

      const documents = results.map((r) => (r.payload?.text as string) ?? '');

      const response = await fetch(COHERE_RERANK_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          query,
          documents,
          top_n: Math.min(this.topN, results.length),
          return_documents: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        results: Array<{ index: number; relevance_score: number }>;
      };

      console.log(
        '[Cohere Rerank] scores:',
        data.results.map((r) => `#${r.index} ${r.relevance_score.toFixed(4)}`).join(', ')
      );

      return data.results.map((r) => {
        const original = results[r.index]!;
        return {
          ...original,
          semanticScore: original.score,
          bm25Score: 0,
          finalScore: r.relevance_score,
          score: r.relevance_score,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[Cohere Rerank] API call failed, falling back to semantic order:', message);
      return results.map((r) => ({
        ...r,
        semanticScore: r.score,
        bm25Score: 0,
        finalScore: r.score,
        score: r.score,
      }));
    }
  }
}
