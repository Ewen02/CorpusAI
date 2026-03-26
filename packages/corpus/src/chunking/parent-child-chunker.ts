/**
 * Parent-Child Chunker.
 *
 * Strategy:
 * - Split document into logical sections (Markdown headers or "Short title:" lines)
 * - Within each section, create parent chunks (~512 tokens, no overlap)
 * - Within each parent, create child chunks (~128 tokens, ~32 tokens overlap by sentence boundary)
 * - Children are used for embedding/retrieval; parent text is stored as parentContent
 *   so the LLM receives richer context.
 *
 * Fallback: CSV files use TokenChunker(400, 50) with no parentContent.
 */

import { get_encoding, type Tiktoken } from 'tiktoken';
import type { ChunkingService, Chunk, ChunkMetadata, ParentChildChunkerOptions } from './types';

/** Sentence boundary markers used for overlap alignment */
const SENTENCE_BOUNDARIES = ['. ', '.\n', '? ', '?\n', '! ', '!\n', '\n\n'];

interface Section {
  header: string;
  content: string;
}

export class ParentChildChunker implements ChunkingService {
  readonly strategy = 'parent-child';

  private childSize: number;
  private parentSize: number;
  private childOverlap: number;
  private encoding: Tiktoken;

  constructor(options: ParentChildChunkerOptions = {}) {
    this.childSize = options.childSizeTokens ?? 150;
    this.parentSize = options.parentSizeTokens ?? 512;
    this.childOverlap = options.childOverlapTokens ?? 50;
    this.encoding = get_encoding('cl100k_base');
  }

  chunk(text: string, metadata: ChunkMetadata): Chunk[] {
    // CSV fallback: fixed chunking, no parent-child
    if (typeof metadata.source === 'string' && metadata.source.toLowerCase().endsWith('.csv')) {
      return this.csvFallback(text, metadata);
    }

    const sections = this.splitIntoSections(text);
    const chunks: Chunk[] = [];
    let globalIndex = 0;

    for (const section of sections) {
      const sectionChunks = this.chunkSection(section, metadata, globalIndex);
      chunks.push(...sectionChunks);
      globalIndex += sectionChunks.length;
    }

    return chunks.filter((c) => c.text.length > 0);
  }

  dispose(): void {
    this.encoding.free();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  // ─────────────────────────────────────────────────────
  // Section detection
  // ─────────────────────────────────────────────────────

  /**
   * Split text into logical sections at Markdown headers or "Short title:" lines.
   * Each section carries its header string.
   */
  private splitIntoSections(text: string): Section[] {
    const lines = text.split('\n');
    const sections: Section[] = [];

    let currentHeader = '';
    let currentLines: string[] = [];

    const flush = () => {
      const content = currentLines.join('\n').trim();
      if (content) {
        sections.push({ header: currentHeader, content });
      }
    };

    for (const line of lines) {
      const mdMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (mdMatch) {
        flush();
        currentHeader = line.trim();
        currentLines = [];
        continue;
      }

      // Short title: line < 60 chars, ends with ":", no other terminal punctuation in content
      const trimmed = line.trim();
      if (
        trimmed.length > 0 &&
        trimmed.length < 60 &&
        trimmed.endsWith(':') &&
        !/[.!?]/.test(trimmed.slice(0, -1)) // no terminal punct before the colon
      ) {
        flush();
        currentHeader = trimmed;
        currentLines = [];
        continue;
      }

      currentLines.push(line);
    }

    flush();

    // If no sections detected, treat whole text as one section
    if (sections.length === 0) {
      return [{ header: '', content: text.trim() }];
    }

    return sections;
  }

  // ─────────────────────────────────────────────────────
  // Section → parent → children
  // ─────────────────────────────────────────────────────

  private chunkSection(section: Section, metadata: ChunkMetadata, startIndex: number): Chunk[] {
    const parentTexts = this.splitByTokens(section.content, this.parentSize, 0);
    const chunks: Chunk[] = [];
    let index = startIndex;

    for (const parentText of parentTexts) {
      const children = this.splitByTokens(parentText, this.childSize, this.childOverlap);

      for (const childText of children) {
        if (!childText.trim()) continue;
        chunks.push({
          id: crypto.randomUUID(),
          text: childText.trim(),
          metadata: {
            ...metadata,
            chunkIndex: index,
            parentContent: parentText.trim(),
            sectionHeader: section.header || undefined,
            tokenCount: this.countTokens(childText.trim()),
          },
          index,
        });
        index++;
      }
    }

    return chunks;
  }

  // ─────────────────────────────────────────────────────
  // Token-based splitting with sentence-boundary overlap
  // ─────────────────────────────────────────────────────

  /**
   * Split text into chunks of `maxTokens` tokens.
   * Overlap is expressed in tokens but aligned to sentence boundaries.
   */
  private splitByTokens(text: string, maxTokens: number, overlapTokens: number): string[] {
    const chunks: string[] = [];

    // Split on sentence-friendly separators, preserving the separator
    const segments = this.sentenceSplit(text);

    let current: string[] = [];
    let currentTokens = 0;

    const flush = () => {
      const t = current.join('');
      if (t.trim()) chunks.push(t);
    };

    for (const seg of segments) {
      const segTokens = this.countTokens(seg);

      if (segTokens > maxTokens) {
        // Segment itself exceeds max — flush current, then word-split the segment
        if (current.length > 0) {
          flush();
          const overlap = this.extractOverlap(current.join(''), overlapTokens);
          current = overlap ? [overlap] : [];
          currentTokens = this.countTokens(current.join(''));
        }
        const sub = this.wordSplit(seg, maxTokens, overlapTokens);
        chunks.push(...sub);
        // seed overlap from last sub-chunk
        if (sub.length > 0) {
          const lastSub = sub[sub.length - 1]!;
          const overlap = this.extractOverlap(lastSub, overlapTokens);
          current = overlap ? [overlap] : [];
          currentTokens = this.countTokens(current.join(''));
        }
        continue;
      }

      if (currentTokens + segTokens > maxTokens && current.length > 0) {
        flush();
        const overlap = this.extractOverlap(current.join(''), overlapTokens);
        current = overlap ? [overlap] : [];
        currentTokens = this.countTokens(current.join(''));
      }

      current.push(seg);
      currentTokens += segTokens;
    }

    if (current.length > 0) flush();

    return chunks;
  }

  /**
   * Split text by sentence boundaries, keeping the boundary attached to its segment.
   */
  private sentenceSplit(text: string): string[] {
    // Split on \n\n, \n, '. ', '? ', '! ' — keep delimiter attached to previous segment
    const result: string[] = [];
    const separators = ['\n\n', '\n', '. ', '? ', '! '];

    // Find the first separator that exists in the text
    for (const sep of separators) {
      if (text.includes(sep)) {
        const parts = text.split(sep);
        return parts.map((p, i) => (i < parts.length - 1 ? p + sep : p)).filter((p) => p);
      }
    }

    return [text];
  }

  /**
   * Word-level split for segments that exceed maxTokens.
   */
  private wordSplit(text: string, maxTokens: number, overlapTokens: number): string[] {
    const chunks: string[] = [];
    const words = text.split(' ');
    let current: string[] = [];
    let currentTokens = 0;

    for (const word of words) {
      const wTokens = this.countTokens(word + ' ');
      if (currentTokens + wTokens > maxTokens && current.length > 0) {
        chunks.push(current.join(' '));
        const overlapWords = this.getOverlapWords(current, overlapTokens);
        current = [...overlapWords, word];
        currentTokens = this.countTokens(current.join(' '));
      } else {
        current.push(word);
        currentTokens += wTokens;
      }
    }

    if (current.length > 0) chunks.push(current.join(' '));
    return chunks;
  }

  private getOverlapWords(words: string[], overlapTokens: number): string[] {
    if (overlapTokens === 0) return [];
    const result: string[] = [];
    let tokens = 0;
    for (let i = words.length - 1; i >= 0 && tokens < overlapTokens; i--) {
      const w = words[i]!;
      result.unshift(w);
      tokens += this.countTokens(w + ' ');
    }
    return result;
  }

  // ─────────────────────────────────────────────────────
  // Sentence-boundary-aligned overlap
  // ─────────────────────────────────────────────────────

  /**
   * Extract up to `overlapTokens` from the end of `text`, aligned to a sentence boundary.
   *
   * Rules (per spec):
   * - Extract the last N tokens from text.
   * - If the extracted text starts in the middle of a sentence (i.e., there's no sentence
   *   boundary at or before its start), walk forward until we find a sentence boundary.
   * - If no boundary found within the extracted window, return '' (no overlap for this chunk).
   */
  private extractOverlap(text: string, overlapTokens: number): string {
    if (overlapTokens === 0 || !text.trim()) return '';

    const allTokens = this.encoding.encode(text);
    if (allTokens.length <= overlapTokens) return text;

    // Take the last overlapTokens tokens
    const overlapTokenIds = allTokens.slice(-overlapTokens);
    const decoder = new TextDecoder();
    const overlapText = decoder.decode(this.encoding.decode(overlapTokenIds));

    // Check if overlap starts at a sentence boundary (preceded by a sentence-end marker)
    const overlapStart = text.length - overlapText.length;
    const preceding = text.slice(Math.max(0, overlapStart - 2), overlapStart);

    const startsAtBoundary = SENTENCE_BOUNDARIES.some((b) => {
      // The overlap starts right after a boundary in the original text
      return text.slice(0, overlapStart).endsWith(b);
    });

    if (startsAtBoundary) {
      return overlapText;
    }

    // Walk forward inside overlapText to find the first sentence boundary
    for (const boundary of SENTENCE_BOUNDARIES) {
      const idx = overlapText.indexOf(boundary);
      if (idx !== -1) {
        // Return from after this boundary to end of overlapText
        const aligned = overlapText.slice(idx + boundary.length);
        if (aligned.trim()) return aligned;
      }
    }

    // No boundary found → no overlap
    return '';
  }

  // ─────────────────────────────────────────────────────
  // CSV fallback
  // ─────────────────────────────────────────────────────

  private csvFallback(text: string, metadata: ChunkMetadata): Chunk[] {
    // Fixed chunking: 400 tokens, 50 overlap, no parentContent
    const chunks = this.splitByTokens(text, 400, 50);
    return chunks
      .map((t, i) => ({
        id: crypto.randomUUID(),
        text: t.trim(),
        metadata: {
          ...metadata,
          chunkIndex: i,
          tokenCount: this.countTokens(t.trim()),
        },
        index: i,
      }))
      .filter((c) => c.text.length > 0);
  }

  // ─────────────────────────────────────────────────────
  // Token counting
  // ─────────────────────────────────────────────────────

  private countTokens(text: string): number {
    return this.encoding.encode(text).length;
  }
}
