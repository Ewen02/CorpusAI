/**
 * Types pour le service de stockage vectoriel.
 *
 * Architecture: collection globale unique "corpus_vectors" avec multi-tenancy
 * via filtre payload `ai_id` + is_tenant index. Hybrid search dense + sparse.
 */

// ---------------------------------------------------------------------------
// Sparse vectors (BM25 native Qdrant)
// ---------------------------------------------------------------------------

/**
 * Sparse vector representation for hybrid search.
 * Indices are token IDs, values are term weights (log-TF).
 * Qdrant applies IDF server-side via the `idf` modifier.
 */
export interface SparseVector {
  indices: number[];
  values: number[];
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

/**
 * Typed payload for chunk vectors stored in the vector store.
 * This is the standard payload structure used by the RAG pipeline.
 */
export interface ChunkPayload {
  /** AI identifier (tenant key for multi-tenancy filtering) */
  ai_id: string;
  /** The chunk text content (child chunk for parent-child indexed docs) */
  text: string;
  /** Source document name/path */
  source: string;
  /** Parent document ID */
  documentId: string;
  /** Position of this chunk within the document */
  chunkIndex: number;
  /** Parent chunk text (~512 tokens). Only present for parent-child indexed documents.
   *  When present, the RAG pipeline sends this to the LLM instead of `text`. */
  parent_content?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Vector points
// ---------------------------------------------------------------------------

/**
 * A hybrid vector point containing both dense and sparse vectors.
 */
export interface HybridVectorPoint {
  id: string;
  denseVector: number[];
  sparseVector: SparseVector;
  payload: ChunkPayload;
}

/**
 * Legacy single-vector point (kept for backward compatibility).
 */
export interface VectorPoint<TPayload = Record<string, unknown>> {
  id: string;
  vector: number[];
  payload: TPayload;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Résultat d'une recherche vectorielle
 */
export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

/**
 * Options de recherche
 */
export interface SearchOptions {
  /** Nombre de résultats à retourner */
  limit: number;
  /** Score minimum de similarité (0-1) */
  scoreThreshold?: number;
  /** Filtres additionnels sur les payloads (en plus du filtre tenant) */
  filter?: FilterCondition;
  /** Inclure les payloads dans les résultats */
  withPayload?: boolean;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

/**
 * Condition de filtre Qdrant
 */
export interface FilterCondition {
  must?: FilterClause[];
  should?: FilterClause[];
  must_not?: FilterClause[];
}

/**
 * Clause de filtre individuelle
 */
export interface FilterClause {
  key: string;
  match?: { value: string | number | boolean };
  range?: { gte?: number; lte?: number; gt?: number; lt?: number };
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * Interface abstraite pour un service de stockage vectoriel.
 * Supports hybrid search (dense + sparse) with multi-tenant filtering.
 */
export interface VectorStoreService {
  /**
   * Insère ou met à jour des points vectoriels hybrides (dense + sparse).
   * @param isLastBatch - Si true, attend la persistence sur disque (wait: true)
   */
  upsert(points: HybridVectorPoint[], isLastBatch?: boolean): Promise<void>;

  /**
   * Recherche hybride combinant dense et sparse vectors avec RRF fusion.
   * Filtre automatiquement par tenant (aiId).
   */
  hybridSearch(
    denseVector: number[],
    sparseVector: SparseVector,
    aiId: string,
    options: SearchOptions
  ): Promise<SearchResult[]>;

  /**
   * Supprime tous les points d'un document spécifique.
   */
  deleteByDocument(aiId: string, documentId: string): Promise<void>;

  /**
   * Supprime tous les points d'un AI (tenant).
   */
  deleteByAI(aiId: string): Promise<void>;

  /**
   * S'assure que la collection globale existe avec indexes.
   */
  ensureCollection(): Promise<void>;

  /**
   * Nom de la collection
   */
  readonly collectionName: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration pour Qdrant
 */
export interface QdrantConfig {
  /** URL du serveur Qdrant */
  url: string;
  /** Nom de la collection (défaut: 'corpus_vectors') */
  collectionName?: string;
  /** Nombre de dimensions des vecteurs dense (défaut: 512) */
  vectorSize?: number;
  /** Clé API (optionnel, pour Qdrant Cloud) */
  apiKey?: string;
  /** Timeout en ms (défaut: 30000) */
  timeout?: number;
}
