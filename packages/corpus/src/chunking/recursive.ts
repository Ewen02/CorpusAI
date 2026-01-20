import type { ChunkingService, Chunk, ChunkMetadata, RecursiveChunkerOptions } from './types';

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' ', ''];

/**
 * Service de chunking récursif.
 * Découpe le texte en utilisant une hiérarchie de séparateurs.
 *
 * @example
 * ```typescript
 * const chunker = new RecursiveChunker({
 *   chunkSize: 500,
 *   chunkOverlap: 100,
 * });
 *
 * const chunks = chunker.chunk(longText, {
 *   documentId: 'doc-1',
 *   source: 'guide.md',
 * });
 * ```
 */
export class RecursiveChunker implements ChunkingService {
  readonly strategy = 'recursive';
  private chunkSize: number;
  private chunkOverlap: number;
  private separators: string[];

  constructor(options: RecursiveChunkerOptions = {}) {
    this.chunkSize = options.chunkSize ?? 500;
    this.chunkOverlap = options.chunkOverlap ?? 100;
    this.separators = options.separators ?? DEFAULT_SEPARATORS;
  }

  /**
   * Découpe un texte en chunks avec chevauchement.
   */
  chunk(text: string, metadata: ChunkMetadata): Chunk[] {
    const chunks = this.splitText(text, this.separators);

    return chunks.map((chunkText, index) => ({
      id: crypto.randomUUID(),
      text: chunkText.trim(),
      metadata: {
        ...metadata,
        chunkIndex: index,
        totalChunks: chunks.length,
      },
      index,
    }));
  }

  /**
   * Découpe récursivement le texte en utilisant les séparateurs.
   */
  private splitText(text: string, separators: string[]): string[] {
    const finalChunks: string[] = [];

    // Trouver le bon séparateur
    let separator = separators[separators.length - 1];
    let newSeparators: string[] = [];

    for (let i = 0; i < separators.length; i++) {
      const sep = separators[i] ?? '';
      if (sep === '') {
        separator = sep;
        break;
      }
      if (text.includes(sep)) {
        separator = sep;
        newSeparators = separators.slice(i + 1);
        break;
      }
    }

    // Découper avec le séparateur
    const splits = separator ? text.split(separator) : Array.from(text);

    // Fusionner les petits morceaux
    let currentChunk = '';

    for (const split of splits) {
      const piece = split + (separator || '');

      if (currentChunk.length + piece.length <= this.chunkSize) {
        currentChunk += piece;
      } else {
        // Le chunk actuel est complet
        if (currentChunk.length > 0) {
          finalChunks.push(currentChunk);
        }

        // Si le morceau est trop grand, le découper récursivement
        if (piece.length > this.chunkSize && newSeparators.length > 0) {
          const subChunks = this.splitText(piece, newSeparators);
          finalChunks.push(...subChunks);
          currentChunk = '';
        } else {
          // Ajouter l'overlap du chunk précédent
          const overlap = this.getOverlap(finalChunks[finalChunks.length - 1] || '');
          currentChunk = overlap + piece;
        }
      }
    }

    // Ajouter le dernier chunk
    if (currentChunk.length > 0) {
      finalChunks.push(currentChunk);
    }

    return finalChunks.filter((chunk) => chunk.trim().length > 0);
  }

  /**
   * Récupère la fin du chunk précédent pour l'overlap.
   */
  private getOverlap(previousChunk: string): string {
    if (this.chunkOverlap === 0 || !previousChunk) {
      return '';
    }

    // Prendre les derniers caractères sans couper au milieu d'un mot
    const overlapText = previousChunk.slice(-this.chunkOverlap);
    const firstSpace = overlapText.indexOf(' ');

    if (firstSpace > 0) {
      return overlapText.slice(firstSpace + 1);
    }

    return overlapText;
  }
}
