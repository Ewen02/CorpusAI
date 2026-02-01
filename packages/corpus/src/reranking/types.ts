import type { SearchResult } from '../vector-store/types';

/**
 * Configuration pour le reranking hybride.
 */
export interface RerankerConfig {
  /** Poids du score sémantique (cosine similarity). Défaut: 0.6 */
  semanticWeight?: number;
  /** Poids du score BM25 (lexical). Défaut: 0.4 */
  bm25Weight?: number;
}

/**
 * Résultat enrichi avec les scores détaillés.
 */
export interface ScoredResult extends SearchResult {
  /** Score sémantique original (cosine similarity de Qdrant) */
  semanticScore: number;
  /** Score BM25 normalisé [0, 1] */
  bm25Score: number;
  /** Score final combiné (weighted sum) */
  finalScore: number;
}

/**
 * Interface pour un service de reranking.
 */
export interface Reranker {
  /**
   * Réordonne les résultats en combinant plusieurs signaux de scoring.
   * @param results - Résultats de recherche vectorielle
   * @param query - Requête utilisateur originale
   * @param config - Configuration des poids
   * @returns Résultats réordonnés avec scores détaillés
   */
  rerank(
    results: SearchResult[],
    query: string,
    config?: RerankerConfig
  ): ScoredResult[];
}
