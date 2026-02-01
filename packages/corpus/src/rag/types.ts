import type { FilterCondition } from '../vector-store/types';
import type { RerankerConfig } from '../reranking/types';

/**
 * Types pour le pipeline RAG.
 */

/**
 * Document à indexer
 */
export interface Document {
  /** ID unique du document */
  id: string;
  /** Contenu textuel */
  content: string;
  /** Nom/titre du document */
  source: string;
  /** Métadonnées additionnelles (workspaceId, userId, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * Résultat de l'indexation
 */
export interface IndexResult {
  /** Nombre de documents indexés */
  documentsIndexed: number;
  /** Nombre de chunks créés */
  chunksCreated: number;
  /** IDs des chunks créés */
  chunkIds: string[];
}

/**
 * Étape de traitement pour le progress callback
 */
export type ProcessingStage = 'chunking' | 'embedding' | 'storing';

/**
 * Callback de progression pour l'indexation
 */
export interface ProgressCallback {
  /**
   * Appelé à chaque mise à jour de progression.
   * @param stage - Étape en cours (chunking, embedding, storing)
   * @param progress - Progression de 0 à 100
   * @param details - Détails optionnels (ex: "Batch 3/10")
   */
  (stage: ProcessingStage, progress: number, details?: string): void;
}

/**
 * Options d'indexation
 */
export interface IndexOptions {
  /** Callback de progression */
  onProgress?: ProgressCallback;
}

/**
 * Options de requête RAG
 */
export interface QueryOptions {
  /** Nombre de chunks à récupérer */
  topK?: number;
  /** Score minimum de similarité */
  scoreThreshold?: number;
  /** Filtres sur les métadonnées */
  filter?: FilterCondition;
  /** Inclure les sources dans la réponse */
  includeSources?: boolean;
  /** Configuration du reranking hybride (BM25 + sémantique) */
  rerankerConfig?: RerankerConfig;
  /** Historique de conversation pour le contexte multi-tour */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Limite de caractères pour le contexte (approximation tokens × 4). Default: 16000 (~4000 tokens) */
  maxContextChars?: number;
}

/**
 * Source citée dans la réponse
 */
export interface Source {
  /** ID du chunk */
  chunkId: string;
  /** Nom du document source */
  documentSource: string;
  /** Score de similarité */
  score: number;
  /** Extrait du texte */
  text: string;
}

/**
 * Métriques de latence d'une query RAG.
 */
export interface QueryMetrics {
  /** Temps d'embedding de la question (ms) */
  embeddingMs: number;
  /** Temps de recherche vectorielle (ms) */
  searchMs: number;
  /** Temps de reranking (ms) - 0 si pas de reranker */
  rerankMs: number;
  /** Temps de génération LLM (ms) */
  llmMs: number;
  /** Temps total de la query (ms) */
  totalMs: number;
}

/**
 * Réponse du pipeline RAG
 */
export interface RAGResponse {
  /** Réponse générée par le LLM */
  answer: string;
  /** Sources utilisées */
  sources: Source[];
  /** Contexte envoyé au LLM */
  context: string;
  /** Métriques de latence (optionnel) */
  metrics?: QueryMetrics;
}

/**
 * Configuration du LLM
 */
export interface LLMConfig {
  /** Clé API OpenAI */
  apiKey: string;
  /** Modèle à utiliser */
  model?: string;
  /** Temperature (0 = déterministe, 1 = créatif) */
  temperature?: number;
  /** Nombre max de tokens en sortie */
  maxTokens?: number;
  /** Prompt système personnalisé */
  systemPrompt?: string;
  /** Active les logs de debug (désactivé par défaut) */
  debug?: boolean;
}

/**
 * Interface du pipeline RAG
 */
export interface RAGPipeline {
  /**
   * Indexe des documents dans le vector store.
   * @param documents - Documents à indexer
   * @param options - Options d'indexation (callback de progression, etc.)
   */
  index(documents: Document[], options?: IndexOptions): Promise<IndexResult>;

  /**
   * Pose une question et obtient une réponse basée sur les documents.
   */
  query(question: string, options?: QueryOptions): Promise<RAGResponse>;

  /**
   * Pose une question avec streaming de la réponse.
   */
  queryStream(
    question: string,
    options?: QueryOptions
  ): AsyncGenerator<string, RAGResponse>;

  /**
   * Supprime des documents de l'index.
   */
  deleteDocuments(documentIds: string[]): Promise<void>;
}
