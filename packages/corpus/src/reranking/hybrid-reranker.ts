import type { SearchResult } from '../vector-store/types';
import type { Reranker, RerankerConfig, ScoredResult } from './types';
import { BM25 } from './bm25';

/**
 * Configuration par défaut pour le reranking hybride.
 * 60% sémantique + 40% lexical offre un bon équilibre entre
 * compréhension contextuelle et correspondance exacte des termes.
 */
const DEFAULT_CONFIG: Required<RerankerConfig> = {
  semanticWeight: 0.6,
  bm25Weight: 0.4,
};

/**
 * Reranker hybride combinant score sémantique (embedding cosine similarity)
 * et score lexical (BM25).
 *
 * Avantages:
 * - Le score sémantique capture la similarité conceptuelle
 * - Le score BM25 capture les correspondances exactes de termes
 * - La combinaison améliore la précision globale du retrieval
 *
 * Utilisation typique:
 * ```typescript
 * const reranker = new HybridReranker();
 * const rerankedResults = reranker.rerank(searchResults, userQuery);
 * ```
 */
export class HybridReranker implements Reranker {
  /**
   * Réordonne les résultats en combinant scores sémantique et BM25.
   *
   * @param results - Résultats de la recherche vectorielle (avec score cosine)
   * @param query - Requête utilisateur originale
   * @param config - Configuration des poids (optionnel)
   * @returns Résultats triés par score combiné décroissant
   */
  rerank(
    results: SearchResult[],
    query: string,
    config: RerankerConfig = {}
  ): ScoredResult[] {
    if (results.length === 0) {
      return [];
    }

    const { semanticWeight, bm25Weight } = { ...DEFAULT_CONFIG, ...config };

    // Extraire les textes des résultats pour BM25
    const texts = results.map((r) => {
      const text = r.payload?.text;
      return typeof text === 'string' ? text : '';
    });

    // Construire l'index BM25 sur les textes récupérés
    const bm25 = new BM25(texts);

    // Calculer les scores combinés
    const scored: ScoredResult[] = results.map((result, index) => {
      const semanticScore = result.score;
      const bm25Score = bm25.scoreNormalized(query, index);

      // Score final = weighted sum
      const finalScore = semanticWeight * semanticScore + bm25Weight * bm25Score;

      return {
        ...result,
        semanticScore,
        bm25Score,
        finalScore,
        // Override le score original pour compatibilité
        score: finalScore,
      };
    });

    // Trier par score final décroissant
    return scored.sort((a, b) => b.finalScore - a.finalScore);
  }
}
