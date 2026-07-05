import { describe, it, expect } from 'vitest';
import { assignPageNumbers, type PageRange } from './page-mapper';
import type { Chunk } from './types';

const makeChunk = (text: string, index: number): Chunk => ({
  id: `chunk-${index}`,
  text,
  index,
  metadata: { documentId: 'doc-1', source: 'doc.pdf', chunkIndex: index },
});

describe('assignPageNumbers', () => {
  // Contenu : page 1 = [0, 20), page 2 = [22, 44)
  const page1 = 'Contenu de la page 1';
  const page2 = 'Contenu de la page 2';
  const content = `${page1}\n\n${page2}`;
  const pages: PageRange[] = [
    { pageNumber: 1, startOffset: 0, endOffset: page1.length },
    { pageNumber: 2, startOffset: page1.length + 2, endOffset: content.length },
  ];

  it('assigns the page containing the chunk start', () => {
    const chunks = [makeChunk('Contenu de la page 1', 0), makeChunk('Contenu de la page 2', 1)];

    assignPageNumbers(chunks, content, pages);

    expect(chunks[0]!.metadata.pageNumber).toBe(1);
    expect(chunks[1]!.metadata.pageNumber).toBe(2);
  });

  it('resolves repeated text to the right occurrence via the moving cursor', () => {
    // Le même texte apparaît sur les deux pages — le 2e chunk doit matcher la page 2
    const repeated = 'Texte identique';
    const repContent = `${repeated}\n\n${repeated}`;
    const repPages: PageRange[] = [
      { pageNumber: 1, startOffset: 0, endOffset: repeated.length },
      { pageNumber: 2, startOffset: repeated.length + 2, endOffset: repContent.length },
    ];
    const chunks = [makeChunk(repeated, 0), makeChunk(repeated, 1)];

    assignPageNumbers(chunks, repContent, repPages);

    expect(chunks[0]!.metadata.pageNumber).toBe(1);
    expect(chunks[1]!.metadata.pageNumber).toBe(2);
  });

  it('leaves pageNumber undefined when the chunk text is not found', () => {
    const chunks = [makeChunk('texte absent du contenu', 0)];

    assignPageNumbers(chunks, content, pages);

    expect(chunks[0]!.metadata.pageNumber).toBeUndefined();
  });

  it('handles chunks overlapping the previous one (backtrack window)', () => {
    // chunk 2 commence AVANT la fin du chunk 1 (overlap de chunker)
    const chunks = [makeChunk('Contenu de la page 1', 0), makeChunk('la page 1', 1)];

    assignPageNumbers(chunks, content, pages);

    expect(chunks[1]!.metadata.pageNumber).toBe(1);
  });

  it('is a no-op without pages or chunks', () => {
    const chunks = [makeChunk('Contenu de la page 1', 0)];
    assignPageNumbers(chunks, content, []);
    expect(chunks[0]!.metadata.pageNumber).toBeUndefined();

    expect(() => assignPageNumbers([], content, pages)).not.toThrow();
  });
});
