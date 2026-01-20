import type { FilterCondition } from '../vector-store/types';

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
 * Réponse du pipeline RAG
 */
export interface RAGResponse {
  /** Réponse générée par le LLM */
  answer: string;
  /** Sources utilisées */
  sources: Source[];
  /** Contexte envoyé au LLM */
  context: string;
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
}

/**
 * Interface du pipeline RAG
 */
export interface RAGPipeline {
  /**
   * Indexe des documents dans le vector store.
   */
  index(documents: Document[]): Promise<IndexResult>;

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
