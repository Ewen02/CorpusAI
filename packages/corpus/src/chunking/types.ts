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
  /** Texte du parent chunk (~512 tokens). Absent sur les anciens docs → fallback sur text. */
  parentContent?: string;
  /** Header de section détecté (Markdown ou "Titre :") */
  sectionHeader?: string;
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

/**
 * Options pour le chunking parent-child
 */
export interface ParentChildChunkerOptions {
  /** Taille cible des child chunks en tokens (défaut: 128) */
  childSizeTokens?: number;
  /** Taille cible des parent chunks en tokens (défaut: 512) */
  parentSizeTokens?: number;
  /** Overlap entre children en tokens, par frontières de phrases (défaut: 32) */
  childOverlapTokens?: number;
}

/**
 * Options pour le chunking basé sur les tokens
 */
export interface TokenChunkerOptions {
  /** Taille cible d'un chunk en tokens (défaut: 400) */
  chunkSizeTokens?: number;
  /** Chevauchement entre chunks en tokens (défaut: 50) */
  overlapTokens?: number;
  /** Séparateurs utilisés pour le splitting (du plus prioritaire au moins) */
  separators?: string[];
}
