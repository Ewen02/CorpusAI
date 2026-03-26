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
 * Chunk indexé — données persistables en DB
 */
export interface IndexedChunk {
  /** Qdrant point ID */
  id: string;
  /** Texte du chunk */
  text: string;
  /** Position dans le document */
  position: number;
  /** Numéro de page (optionnel) */
  pageNumber?: number;
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
  /** Chunks avec leur contenu (pour persistance DB) */
  chunks: IndexedChunk[];
}

/**
 * Étape de traitement pour le progress callback
 */
export type ProcessingStage = 'chunking' | 'enriching' | 'embedding' | 'storing';

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
 * Configuration de l'enrichissement contextuel des chunks
 */
export interface ContextEnrichmentConfig {
  /** OpenAI API key (réutilise celui du LLM config si absent) */
  apiKey?: string;
  /** Base URL optionnel (ex: OpenRouter) */
  baseURL?: string;
  /** Modèle à utiliser. Défaut: 'gpt-4o-mini' */
  model?: string;
  /** Concurrence max d'appels simultanés. Défaut: 5 */
  concurrency?: number;
  /** Nombre max de tokens pour la troncature du document. Défaut: 6000 */
  maxDocumentTokens?: number;
  /** Coût estimé maximum en USD avant d'abandonner l'enrichissement. Défaut: 0.10 */
  maxCostUsd?: number;
}

/**
 * Options d'indexation
 */
export interface IndexOptions {
  /** Callback de progression */
  onProgress?: ProgressCallback;
  /** Active l'enrichissement contextuel des chunks avant embedding */
  enableContextEnrichment?: boolean;
  /** Config de l'enrichissement (utilise les defaults si absent) */
  contextEnrichmentConfig?: ContextEnrichmentConfig;
}

/**
 * Options de requête RAG
 */
export interface QueryOptions {
  /** Nombre de chunks à récupérer depuis Qdrant. Si absent: 10 avec CohereReranker, 5 sinon */
  topK?: number;
  /** Nombre de résultats à garder après reranking Cohere. Défaut: 3 */
  topN?: number;
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
  /** Active HyDE (Hypothetical Document Embeddings). Si absent : heuristique automatique (question < 8 mots sans mot-clé spécifique) */
  useHyde?: boolean;
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
  /** Tokens utilisés pour le prompt */
  promptTokens?: number;
  /** Tokens générés en réponse */
  completionTokens?: number;
  /** Total tokens (prompt + completion) */
  totalTokens?: number;
  /** Temps de génération HyDE (ms). Absent si HyDE non utilisé */
  hydeMs?: number;
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
  /** Clé API (OpenAI, OpenRouter, ou tout provider compatible) */
  apiKey: string;
  /** Base URL du provider (ex: https://openrouter.ai/api/v1). Défaut: OpenAI */
  baseURL?: string;
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
  queryStream(question: string, options?: QueryOptions): AsyncGenerator<string, RAGResponse>;

  /**
   * Supprime des documents de l'index.
   */
  deleteDocuments(documentIds: string[]): Promise<void>;
}
