import type { ChunkingService, Chunk, ChunkMetadata, MarkdownChunkerOptions } from './types';

/**
 * Service de chunking optimisé pour le Markdown.
 * Respecte la structure du document (headers, paragraphes).
 *
 * @example
 * ```typescript
 * const chunker = new MarkdownChunker({
 *   maxChunkSize: 800,
 *   includeHeaders: true,
 * });
 *
 * const chunks = chunker.chunk(markdownText, {
 *   documentId: 'doc-1',
 *   source: 'readme.md',
 * });
 * ```
 */
export class MarkdownChunker implements ChunkingService {
  readonly strategy = 'markdown';
  private maxChunkSize: number;
  private includeHeaders: boolean;

  constructor(options: MarkdownChunkerOptions = {}) {
    this.maxChunkSize = options.maxChunkSize ?? 800;
    this.includeHeaders = options.includeHeaders ?? true;
  }

  /**
   * Découpe un texte Markdown en chunks en respectant la structure.
   */
  chunk(text: string, metadata: ChunkMetadata): Chunk[] {
    const sections = this.splitBySections(text);
    const chunks: Chunk[] = [];
    let chunkIndex = 0;

    for (const section of sections) {
      // Si la section est trop grande, la découper
      if (section.content.length > this.maxChunkSize) {
        const subChunks = this.splitLargeSection(section, chunkIndex, metadata);
        chunks.push(...subChunks);
        chunkIndex += subChunks.length;
      } else {
        chunks.push({
          id: crypto.randomUUID(),
          text: this.formatSection(section),
          metadata: {
            ...metadata,
            header: section.header,
            headerLevel: section.level,
            chunkIndex,
          },
          index: chunkIndex,
        });
        chunkIndex++;
      }
    }

    return chunks;
  }

  /**
   * Découpe le Markdown en sections basées sur les headers.
   */
  private splitBySections(text: string): MarkdownSection[] {
    const sections: MarkdownSection[] = [];
    // Regex pour matcher les headers Markdown (# à ######)
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;

    let lastIndex = 0;
    let currentHeader = '';
    let currentLevel = 0;
    let match;

    while ((match = headerRegex.exec(text)) !== null) {
      // Sauvegarder la section précédente
      if (lastIndex < match.index) {
        const content = text.slice(lastIndex, match.index).trim();
        if (content) {
          sections.push({
            header: currentHeader,
            level: currentLevel,
            content,
          });
        }
      }

      currentHeader = match[2] ?? '';
      currentLevel = match[1]?.length ?? 0;
      lastIndex = match.index + match[0].length;
    }

    // Dernière section
    const remainingContent = text.slice(lastIndex).trim();
    if (remainingContent) {
      sections.push({
        header: currentHeader,
        level: currentLevel,
        content: remainingContent,
      });
    }

    // Si pas de headers, retourner tout le texte comme une section
    if (sections.length === 0 && text.trim()) {
      sections.push({
        header: '',
        level: 0,
        content: text.trim(),
      });
    }

    return sections;
  }

  /**
   * Découpe une section trop grande en sous-chunks.
   */
  private splitLargeSection(
    section: MarkdownSection,
    startIndex: number,
    metadata: ChunkMetadata
  ): Chunk[] {
    const chunks: Chunk[] = [];

    // Découper par paragraphes
    const paragraphs = section.content.split(/\n\n+/);
    let currentChunk = '';
    let chunkIndex = startIndex;

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length + 2 <= this.maxChunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        // Sauvegarder le chunk actuel
        if (currentChunk) {
          chunks.push({
            id: crypto.randomUUID(),
            text: this.formatSection({
              header: section.header,
              level: section.level,
              content: currentChunk,
            }),
            metadata: {
              ...metadata,
              header: section.header,
              headerLevel: section.level,
              chunkIndex,
            },
            index: chunkIndex,
          });
          chunkIndex++;
        }
        currentChunk = paragraph;
      }
    }

    // Dernier chunk
    if (currentChunk) {
      chunks.push({
        id: crypto.randomUUID(),
        text: this.formatSection({
          header: section.header,
          level: section.level,
          content: currentChunk,
        }),
        metadata: {
          ...metadata,
          header: section.header,
          headerLevel: section.level,
          chunkIndex,
        },
        index: chunkIndex,
      });
    }

    return chunks;
  }

  /**
   * Formate une section avec son header si demandé.
   */
  private formatSection(section: MarkdownSection): string {
    if (this.includeHeaders && section.header && section.level > 0) {
      const headerPrefix = '#'.repeat(section.level);
      return `${headerPrefix} ${section.header}\n\n${section.content}`;
    }
    return section.content;
  }
}

interface MarkdownSection {
  header: string;
  level: number;
  content: string;
}
