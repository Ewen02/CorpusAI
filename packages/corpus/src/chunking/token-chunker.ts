/**
 * Chunker basé sur les tokens.
 * Utilise tiktoken pour compter précisément les tokens et respecter les limites du modèle.
 */

import { get_encoding, type Tiktoken } from 'tiktoken';
import type { ChunkingService, Chunk, ChunkMetadata, TokenChunkerOptions } from './types';

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ', ', ' '];

export class TokenChunker implements ChunkingService {
  readonly strategy = 'token';

  private chunkSizeTokens: number;
  private overlapTokens: number;
  private separators: string[];
  private encoding: Tiktoken;

  /** Cache for token counts - only caches strings < 1000 chars to limit memory */
  private tokenCountCache = new Map<string, number>();
  private static readonly MAX_CACHE_STRING_LENGTH = 1000;
  private static readonly MAX_CACHE_SIZE = 10000;

  constructor(options: TokenChunkerOptions = {}) {
    this.chunkSizeTokens = options.chunkSizeTokens ?? 400;
    this.overlapTokens = options.overlapTokens ?? 50;
    this.separators = options.separators ?? DEFAULT_SEPARATORS;

    // cl100k_base est utilisé par GPT-4, GPT-3.5-turbo, text-embedding-3-*
    this.encoding = get_encoding('cl100k_base');
  }

  /**
   * Découpe un texte en chunks basés sur les tokens.
   */
  chunk(text: string, metadata: ChunkMetadata): Chunk[] {
    const chunks: Chunk[] = [];
    const segments = this.splitByBestSeparator(text);

    let currentSegments: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    let charOffset = 0;

    for (const segment of segments) {
      const segmentTokens = this.countTokens(segment);

      // Si un segment dépasse la taille max, on le découpe récursivement
      if (segmentTokens > this.chunkSizeTokens) {
        // D'abord, flush le chunk courant
        if (currentSegments.length > 0) {
          chunks.push(
            this.createChunk(currentSegments.join(''), chunkIndex++, metadata, charOffset)
          );
          charOffset += currentSegments.join('').length;

          // Récupère l'overlap
          const overlapText = this.getOverlapText(currentSegments);
          currentSegments = overlapText ? [overlapText] : [];
          currentTokens = this.countTokens(currentSegments.join(''));
        }

        // Découpe le grand segment
        const subChunks = this.splitLargeSegment(segment, metadata, chunkIndex, charOffset);
        chunks.push(...subChunks);
        chunkIndex += subChunks.length;
        charOffset += segment.length;
        continue;
      }

      // Vérifie si on peut ajouter ce segment au chunk courant
      if (currentTokens + segmentTokens <= this.chunkSizeTokens) {
        currentSegments.push(segment);
        currentTokens += segmentTokens;
      } else {
        // Crée un chunk avec le contenu actuel
        if (currentSegments.length > 0) {
          chunks.push(
            this.createChunk(currentSegments.join(''), chunkIndex++, metadata, charOffset)
          );
          charOffset += currentSegments.join('').length;

          // Récupère l'overlap pour le prochain chunk
          const overlapText = this.getOverlapText(currentSegments);
          currentSegments = overlapText ? [overlapText, segment] : [segment];
          currentTokens = this.countTokens(currentSegments.join(''));
        } else {
          currentSegments = [segment];
          currentTokens = segmentTokens;
        }
      }
    }

    // Dernier chunk
    if (currentSegments.length > 0) {
      chunks.push(
        this.createChunk(currentSegments.join(''), chunkIndex, metadata, charOffset)
      );
    }

    // Filtrer les chunks vides (après trim)
    return chunks.filter((chunk) => chunk.text.length > 0);
  }

  /**
   * Compte le nombre de tokens dans un texte.
   * Utilise un cache pour les petites strings (<1000 chars) fréquemment réutilisées.
   */
  countTokens(text: string): number {
    // Check cache first for small strings
    if (text.length < TokenChunker.MAX_CACHE_STRING_LENGTH) {
      const cached = this.tokenCountCache.get(text);
      if (cached !== undefined) {
        return cached;
      }
    }

    const count = this.encoding.encode(text).length;

    // Cache only small strings to limit memory usage
    if (text.length < TokenChunker.MAX_CACHE_STRING_LENGTH) {
      // Evict oldest entries if cache is too large
      if (this.tokenCountCache.size >= TokenChunker.MAX_CACHE_SIZE) {
        const firstKey = this.tokenCountCache.keys().next().value;
        if (firstKey !== undefined) {
          this.tokenCountCache.delete(firstKey);
        }
      }
      this.tokenCountCache.set(text, count);
    }

    return count;
  }

  /**
   * Libère les ressources de l'encoding et vide le cache (important pour la mémoire).
   */
  dispose(): void {
    this.encoding.free();
    this.tokenCountCache.clear();
  }

  /**
   * ES2024 Disposable pattern support.
   * Usage: using chunker = new TokenChunker();
   */
  [Symbol.dispose](): void {
    this.dispose();
  }

  /**
   * Découpe le texte en utilisant le meilleur séparateur disponible.
   */
  private splitByBestSeparator(text: string): string[] {
    for (const separator of this.separators) {
      if (text.includes(separator)) {
        const parts = text.split(separator);
        // Ré-ajoute le séparateur à la fin de chaque partie (sauf la dernière)
        return parts.map((part, i) =>
          i < parts.length - 1 ? part + separator : part
        ).filter((p) => p.length > 0);
      }
    }

    // Pas de séparateur trouvé, retourne le texte entier
    return [text];
  }

  /**
   * Découpe un segment trop grand en sous-chunks.
   */
  private splitLargeSegment(
    segment: string,
    metadata: ChunkMetadata,
    startIndex: number,
    charOffset: number
  ): Chunk[] {
    const chunks: Chunk[] = [];
    const words = segment.split(' ');

    let currentWords: string[] = [];
    let currentTokens = 0;
    let chunkIndex = startIndex;
    let localOffset = 0;

    for (const word of words) {
      const wordWithSpace = word + ' ';
      const wordTokens = this.countTokens(wordWithSpace);

      if (currentTokens + wordTokens <= this.chunkSizeTokens) {
        currentWords.push(word);
        currentTokens += wordTokens;
      } else {
        // Crée un chunk avec les mots accumulés
        if (currentWords.length > 0) {
          const text = currentWords.join(' ');
          chunks.push(
            this.createChunk(text, chunkIndex++, metadata, charOffset + localOffset)
          );
          localOffset += text.length + 1; // +1 pour l'espace

          // Overlap: garde les derniers mots
          const overlapWords = this.getOverlapWords(currentWords);
          currentWords = [...overlapWords, word];
          currentTokens = this.countTokens(currentWords.join(' '));
        } else {
          // Le mot seul est trop grand, on le garde quand même
          currentWords = [word];
          currentTokens = wordTokens;
        }
      }
    }

    // Dernier chunk du segment
    if (currentWords.length > 0) {
      chunks.push(
        this.createChunk(
          currentWords.join(' '),
          chunkIndex,
          metadata,
          charOffset + localOffset
        )
      );
    }

    return chunks;
  }

  /**
   * Récupère le texte d'overlap depuis les segments précédents.
   */
  private getOverlapText(segments: string[]): string {
    if (this.overlapTokens === 0) return '';

    const fullText = segments.join('');
    const words = fullText.split(' ').filter((w) => w.length > 0);
    const result: string[] = [];
    let tokens = 0;

    // Prend les mots depuis la fin jusqu'à atteindre le nombre de tokens d'overlap
    for (let i = words.length - 1; i >= 0 && tokens < this.overlapTokens; i--) {
      const word = words[i];
      if (word) {
        result.unshift(word);
        tokens += this.countTokens(word + ' ');
      }
    }

    return result.join(' ');
  }

  /**
   * Récupère les mots d'overlap depuis un tableau de mots.
   */
  private getOverlapWords(words: string[]): string[] {
    if (this.overlapTokens === 0) return [];

    const result: string[] = [];
    let tokens = 0;

    for (let i = words.length - 1; i >= 0 && tokens < this.overlapTokens; i--) {
      const word = words[i];
      if (word) {
        result.unshift(word);
        tokens += this.countTokens(word + ' ');
      }
    }

    return result;
  }

  /**
   * Crée un objet Chunk.
   */
  private createChunk(
    text: string,
    index: number,
    metadata: ChunkMetadata,
    startOffset: number
  ): Chunk {
    const trimmedText = text.trim();

    return {
      id: crypto.randomUUID(),
      text: trimmedText,
      metadata: {
        ...metadata,
        chunkIndex: index,
        startOffset,
        endOffset: startOffset + text.length,
        tokenCount: this.countTokens(trimmedText),
      },
      index,
    };
  }
}
