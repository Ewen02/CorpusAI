import type { FilterCondition } from '../vector-store/types';
import type { RerankerConfig } from '../reranking/types';
import type { PageRange } from '../chunking/page-mapper';
import type { LLMClient } from './llm-client';

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
  /**
   * Offsets des pages dans `content` (fournis par le parser PDF).
   * Permet d'assigner un pageNumber à chaque chunk pour les citations.
   * Volontairement hors de `metadata` : ne doit PAS finir dans le payload Qdrant.
   */
  pages?: PageRange[];
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
  /** Score minimum de similarité (prefetch dense, échelle cosinus). Défaut: RAG_QUERY_DEFAULTS.scoreThreshold */
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
  /**
   * Condense les questions de suivi en question autonome AVANT le retrieval
   * ("dis-m'en plus" → question complète avec son référent). N'a d'effet que si
   * `conversationHistory` est non vide. La question originale reste celle envoyée
   * au LLM pour la génération. Défaut: true
   */
  condenseFollowUp?: boolean;
  /**
   * Active la recherche multi-requêtes pour les questions composées
   * ("compare X et Y") : décomposition LLM en sous-questions, recherches en
   * parallèle, fusion des résultats. Si absent : heuristique automatique
   * (mots-clés compare/différence/versus). Prioritaire sur HyDE quand actif.
   */
  multiQuery?: boolean;
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
  /** Numéro de page d'origine du chunk (PDF avec carte de pages) */
  pageNumber?: number;
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
  /** Temps de condensation de la question de suivi (ms). Absent si pas de condensation */
  condenseMs?: number;
  /** Temps total de la recherche multi-requêtes (ms). Absent si non utilisée */
  multiQueryMs?: number;
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
  /**
   * Provider à utiliser. Détermine quel SDK est instancié sous le capot.
   * - `openai` (défaut): SDK OpenAI sur baseURL OpenAI ou compatible
   * - `anthropic`: SDK Anthropic (messages API). Pas de streaming
   *   via OpenAI SDK — utiliser un adapter dédié dans l'application hôte.
   * - `groq`: SDK OpenAI avec baseURL=https://api.groq.com/openai/v1
   */
  provider?: 'openai' | 'anthropic' | 'groq';
  /** Temperature (0 = déterministe, 1 = créatif) */
  temperature?: number;
  /** Nombre max de tokens en sortie */
  maxTokens?: number;
  /** Prompt système personnalisé */
  systemPrompt?: string;
  /** Active les logs de debug (désactivé par défaut) */
  debug?: boolean;
  /**
   * Client LLM injecté (port `LLMClient`). Si présent, remplace le client
   * OpenAI par défaut pour TOUS les appels de génération du pipeline (réponse,
   * streaming, HyDE, condensation, multi-query) — utilisé par apps/api pour
   * brancher Anthropic Messages API. L'enrichissement d'indexation garde son
   * client OpenAI dédié (configuré séparément).
   */
  client?: LLMClient;
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
