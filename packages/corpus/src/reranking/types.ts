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
 * Interface pour un service de reranking synchrone.
 */
export interface Reranker {
  /**
   * Réordonne les résultats en combinant plusieurs signaux de scoring.
   * @param results - Résultats de recherche vectorielle
   * @param query - Requête utilisateur originale
   * @param config - Configuration des poids
   * @returns Résultats réordonnés avec scores détaillés
   */
  rerank(results: SearchResult[], query: string, config?: RerankerConfig): ScoredResult[];
}

/**
 * Interface pour un service de reranking asynchrone (ex: appel API externe).
 * Le discriminant `isAsync: true` permet de différencier des Reranker sync.
 */
export interface AsyncReranker {
  readonly isAsync: true;
  /**
   * Réordonne les résultats via un appel API externe.
   * @param results - Résultats de recherche vectorielle
   * @param query - Requête utilisateur originale
   * @param config - Configuration optionnelle
   * @returns Promise de résultats réordonnés avec scores détaillés
   */
  rerank(results: SearchResult[], query: string, config?: RerankerConfig): Promise<ScoredResult[]>;
}

/**
 * Configuration pour le CohereReranker.
 */
export interface CohereRerankerConfig {
  /** Cohere API key */
  apiKey: string;
  /** Modèle Cohere. Défaut: 'rerank-multilingual-v3.0' */
  model?: string;
  /** Nombre de résultats à retourner après reranking. Défaut: 3 */
  topN?: number;
}
