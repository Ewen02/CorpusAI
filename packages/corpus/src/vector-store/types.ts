/**
 * Types pour le service de stockage vectoriel.
 */

/**
 * Typed payload for chunk vectors stored in the vector store.
 * This is the standard payload structure used by the RAG pipeline.
 */
export interface ChunkPayload {
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

/**
 * Un point vectoriel à stocker
 */
export interface VectorPoint<TPayload = Record<string, unknown>> {
  id: string;
  vector: number[];
  payload: TPayload;
}

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
  /** Filtres sur les payloads */
  filter?: FilterCondition;
  /** Inclure les payloads dans les résultats */
  withPayload?: boolean;
}

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

/**
 * Interface abstraite pour un service de stockage vectoriel.
 * Permet de changer de provider (Qdrant, Pinecone, etc.) sans modifier le code.
 */
export interface VectorStoreService {
  /**
   * Insère ou met à jour des points vectoriels
   */
  upsert(points: VectorPoint[]): Promise<void>;

  /**
   * Recherche les vecteurs les plus similaires
   */
  search(vector: number[], options: SearchOptions): Promise<SearchResult[]>;

  /**
   * Supprime des points selon un filtre
   */
  delete(filter: FilterCondition): Promise<void>;

  /**
   * Supprime des points par IDs
   */
  deleteByIds(ids: string[]): Promise<void>;

  /**
   * S'assure que la collection existe (la crée si nécessaire)
   */
  ensureCollection(): Promise<void>;

  /**
   * Supprime la collection
   */
  deleteCollection(): Promise<void>;

  /**
   * Nom de la collection
   */
  readonly collectionName: string;
}

/**
 * Configuration pour Qdrant
 */
export interface QdrantConfig {
  /** URL du serveur Qdrant */
  url: string;
  /** Nom de la collection */
  collectionName: string;
  /** Nombre de dimensions des vecteurs */
  vectorSize: number;
  /** Clé API (optionnel, pour Qdrant Cloud) */
  apiKey?: string;
}
