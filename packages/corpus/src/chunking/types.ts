/**
 * Types pour le service de chunking.
 */

/**
 * Un chunk de texte avec ses métadonnées
 */
export interface Chunk {
  /** ID unique du chunk */
  id: string;
  /** Contenu textuel du chunk */
  text: string;
  /** Métadonnées associées */
  metadata: ChunkMetadata;
  /** Index du chunk dans le document original */
  index: number;
}

/**
 * Métadonnées d'un chunk
 */
export interface ChunkMetadata {
  /** ID du document source */
  documentId: string;
  /** Nom/titre du document source */
  source: string;
  /** Position de début dans le document original (caractères) */
  startOffset?: number;
  /** Position de fin dans le document original (caractères) */
  endOffset?: number;
  /** Métadonnées additionnelles */
  [key: string]: unknown;
}

/**
 * Interface abstraite pour un service de chunking.
 */
export interface ChunkingService {
  /**
   * Découpe un texte en chunks.
   */
  chunk(text: string, metadata: ChunkMetadata): Chunk[];

  /**
   * Nom de la stratégie
   */
  readonly strategy: string;
}

/**
 * Options pour le chunking récursif
 */
export interface RecursiveChunkerOptions {
  /** Taille cible d'un chunk en caractères */
  chunkSize?: number;
  /** Chevauchement entre chunks en caractères */
  chunkOverlap?: number;
  /** Séparateurs utilisés (du plus prioritaire au moins prioritaire) */
  separators?: string[];
}

/**
 * Options pour le chunking Markdown
 */
export interface MarkdownChunkerOptions {
  /** Taille maximale d'un chunk en caractères */
  maxChunkSize?: number;
  /** Inclure les headers dans chaque chunk */
  includeHeaders?: boolean;
}
