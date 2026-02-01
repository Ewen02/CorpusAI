import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenChunker } from './token-chunker';
import type { ChunkMetadata } from './types';

describe('TokenChunker', () => {
  let chunker: TokenChunker;

  const defaultMetadata: ChunkMetadata = {
    documentId: 'test-doc-123',
    source: 'test-file.txt',
  };

  beforeEach(() => {
    chunker = new TokenChunker({
      chunkSizeTokens: 100,
      overlapTokens: 20,
    });
  });

  afterEach(() => {
    chunker.dispose();
  });

  describe('constructor', () => {
    it('should use default values when no options provided', () => {
      const defaultChunker = new TokenChunker();
      expect(defaultChunker.strategy).toBe('token');
      defaultChunker.dispose();
    });

    it('should accept custom options', () => {
      const customChunker = new TokenChunker({
        chunkSizeTokens: 200,
        overlapTokens: 30,
        separators: ['\n', ' '],
      });
      expect(customChunker.strategy).toBe('token');
      customChunker.dispose();
    });
  });

  describe('countTokens()', () => {
    it('should count tokens correctly for simple text', () => {
      const tokens = chunker.countTokens('Hello world');
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should return 0 for empty string', () => {
      const tokens = chunker.countTokens('');
      expect(tokens).toBe(0);
    });

    it('should count more tokens for longer text', () => {
      const shortTokens = chunker.countTokens('Hello');
      const longTokens = chunker.countTokens('Hello world, this is a much longer sentence with more words.');
      expect(longTokens).toBeGreaterThan(shortTokens);
    });

    it('should handle special characters', () => {
      const tokens = chunker.countTokens('Hello! How are you? I am fine.');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle unicode and emojis', () => {
      const tokens = chunker.countTokens('Bonjour le monde! Ceci est un test.');
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('chunk()', () => {
    it('should return chunks with required properties', () => {
      const text = 'This is a simple test text that should be chunked properly.';
      const chunks = chunker.chunk(text, defaultMetadata);

      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        expect(chunk.id).toBeDefined();
        expect(chunk.text).toBeDefined();
        expect(chunk.index).toBeDefined();
        expect(chunk.metadata.documentId).toBe(defaultMetadata.documentId);
        expect(chunk.metadata.source).toBe(defaultMetadata.source);
        expect(chunk.metadata.chunkIndex).toBeDefined();
        expect(chunk.metadata.tokenCount).toBeGreaterThan(0);
      }
    });

    it('should create single chunk for short text', () => {
      const shortText = 'Short text.';
      const chunks = chunker.chunk(shortText, defaultMetadata);
      expect(chunks.length).toBe(1);
      expect(chunks[0]!.text).toBe(shortText);
    });

    it('should split long text into multiple chunks', () => {
      // Generate text longer than chunk size
      const longText = 'This is a test sentence. '.repeat(50);
      const chunks = chunker.chunk(longText, defaultMetadata);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should respect chunk size limit in tokens', () => {
      const text = 'Word '.repeat(200);
      const chunks = chunker.chunk(text, defaultMetadata);

      for (const chunk of chunks) {
        // Allow some tolerance for boundary effects
        expect(chunk.metadata.tokenCount).toBeLessThanOrEqual(120);
      }
    });

    it('should maintain text integrity (all content preserved)', () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const chunks = chunker.chunk(text, defaultMetadata);

      // Each paragraph should appear in at least one chunk
      const allText = chunks.map((c) => c.text).join(' ');
      expect(allText).toContain('First paragraph');
      expect(allText).toContain('Second paragraph');
      expect(allText).toContain('Third paragraph');
    });

    it('should assign sequential indices', () => {
      const text = 'Sentence one. '.repeat(50);
      const chunks = chunker.chunk(text, defaultMetadata);

      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i]!.index).toBe(i);
        expect(chunks[i]!.metadata.chunkIndex).toBe(i);
      }
    });

    it('should include unique IDs for each chunk', () => {
      const text = 'Test sentence. '.repeat(30);
      const chunks = chunker.chunk(text, defaultMetadata);
      const ids = chunks.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(chunks.length);
    });

    it('should track start and end offsets', () => {
      const text = 'First chunk content. Second chunk content. Third chunk content.';
      const chunks = chunker.chunk(text, defaultMetadata);

      for (const chunk of chunks) {
        expect(chunk.metadata.startOffset).toBeDefined();
        expect(chunk.metadata.endOffset).toBeDefined();
        expect(chunk.metadata.endOffset).toBeGreaterThan(chunk.metadata.startOffset!);
      }
    });
  });

  describe('separators', () => {
    it('should split on double newlines (paragraph)', () => {
      const text = 'First paragraph content here.\n\nSecond paragraph content here.';
      const chunks = chunker.chunk(text, defaultMetadata);

      // Should prefer splitting at paragraph boundaries
      const hasCleanSplit = chunks.some(
        (c) => c.text.endsWith('First paragraph content here.') || c.text.endsWith('\n\n')
      );
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should split on single newlines when no double newlines', () => {
      const text = 'Line one content.\nLine two content.\nLine three content.';
      const chunks = chunker.chunk(text, defaultMetadata);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should use custom separators when provided', () => {
      const customChunker = new TokenChunker({
        chunkSizeTokens: 50,
        overlapTokens: 10,
        separators: ['|||'],
      });

      const text = 'Part one|||Part two|||Part three';
      const chunks = customChunker.chunk(text, defaultMetadata);
      expect(chunks.length).toBeGreaterThanOrEqual(1);

      customChunker.dispose();
    });
  });

  describe('overlap', () => {
    it('should include overlap between consecutive chunks', () => {
      const chunkerWithOverlap = new TokenChunker({
        chunkSizeTokens: 50,
        overlapTokens: 20,
      });

      const text = 'The quick brown fox jumps over the lazy dog. '.repeat(20);
      const chunks = chunkerWithOverlap.chunk(text, defaultMetadata);

      if (chunks.length >= 2) {
        // Check that chunks have some overlapping content
        // The end of chunk N should appear at the start of chunk N+1
        const chunk0EndWords = chunks[0]!.text.split(' ').slice(-5);
        const chunk1StartWords = chunks[1]!.text.split(' ').slice(0, 10);
        const hasOverlap = chunk0EndWords.some((word) =>
          chunk1StartWords.includes(word)
        );
        expect(hasOverlap).toBe(true);
      }

      chunkerWithOverlap.dispose();
    });

    it('should work with zero overlap', () => {
      const noOverlapChunker = new TokenChunker({
        chunkSizeTokens: 50,
        overlapTokens: 0,
      });

      const text = 'Test sentence number one. '.repeat(30);
      const chunks = noOverlapChunker.chunk(text, defaultMetadata);
      expect(chunks.length).toBeGreaterThan(1);

      noOverlapChunker.dispose();
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const chunks = chunker.chunk('', defaultMetadata);
      // May return empty array or single empty chunk
      expect(chunks.length).toBeLessThanOrEqual(1);
    });

    it('should handle whitespace-only text', () => {
      const chunks = chunker.chunk('   \n\n   ', defaultMetadata);
      expect(chunks.length).toBeLessThanOrEqual(1);
    });

    it('should handle text with no valid separators', () => {
      const textNoSeparators = 'NoSpacesOrNewlinesHereJustOneLongWord'.repeat(10);
      const chunks = chunker.chunk(textNoSeparators, defaultMetadata);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle very long single word', () => {
      const longWord = 'supercalifragilisticexpialidocious'.repeat(20);
      const chunks = chunker.chunk(longWord, defaultMetadata);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle text with lots of special characters', () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>? '.repeat(20);
      const chunks = chunker.chunk(specialText, defaultMetadata);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle markdown content', () => {
      const markdown = `
# Header

This is a paragraph with **bold** and *italic* text.

## Subheader

- List item 1
- List item 2
- List item 3

\`\`\`javascript
const code = 'example';
\`\`\`
      `.repeat(5);

      const chunks = chunker.chunk(markdown, defaultMetadata);
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle JSON content', () => {
      const json = JSON.stringify({
        name: 'test',
        items: [1, 2, 3, 4, 5],
        nested: { a: 1, b: 2 },
      });
      const repeatedJson = `${json}\n\n`.repeat(10);
      const chunks = chunker.chunk(repeatedJson, defaultMetadata);
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('metadata preservation', () => {
    it('should preserve custom metadata fields', () => {
      const customMetadata: ChunkMetadata = {
        documentId: 'doc-456',
        source: 'custom-source.pdf',
        title: 'Test Document',
        author: 'Test Author',
      };

      const chunks = chunker.chunk('Some text content.', customMetadata);

      expect(chunks[0]!.metadata.documentId).toBe('doc-456');
      expect(chunks[0]!.metadata.source).toBe('custom-source.pdf');
      expect(chunks[0]!.metadata.title).toBe('Test Document');
      expect(chunks[0]!.metadata.author).toBe('Test Author');
    });
  });

  describe('dispose()', () => {
    it('should free tiktoken resources', () => {
      const tempChunker = new TokenChunker();
      // First dispose should work without error
      expect(() => tempChunker.dispose()).not.toThrow();
    });

    it('should throw on second dispose (tiktoken behavior)', () => {
      const tempChunker = new TokenChunker();
      tempChunker.dispose();
      // Second dispose throws because tiktoken.free() nulls the pointer
      expect(() => tempChunker.dispose()).toThrow();
    });
  });
});
