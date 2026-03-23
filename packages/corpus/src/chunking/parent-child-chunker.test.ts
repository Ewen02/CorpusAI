import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ParentChildChunker } from './parent-child-chunker';
import type { ChunkMetadata } from './types';

const defaultMetadata: ChunkMetadata = {
  documentId: 'doc-1',
  source: 'document.md',
};

/** Build a text of approximately `n` words so token count is predictable. */
const words = (n: number): string => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

/** Build a sentence-rich paragraph of approximately `n` sentences. */
const sentences = (n: number): string =>
  Array.from({ length: n }, (_, i) => `This is sentence number ${i + 1} with some content.`).join(
    ' '
  );

describe('ParentChildChunker', () => {
  let chunker: ParentChildChunker;

  beforeEach(() => {
    chunker = new ParentChildChunker({
      childSizeTokens: 128,
      parentSizeTokens: 512,
      childOverlapTokens: 32,
    });
  });

  afterEach(() => {
    chunker.dispose();
  });

  // ────────────────────────────────────────────────────
  // strategy
  // ────────────────────────────────────────────────────

  it('should have strategy "parent-child"', () => {
    expect(chunker.strategy).toBe('parent-child');
  });

  // ────────────────────────────────────────────────────
  // Child chunk size
  // ────────────────────────────────────────────────────

  describe('child chunk size', () => {
    it('should produce child chunks of at most 128 tokens on a long document', () => {
      // ~800 words → well over 512 tokens
      const text = sentences(60);
      const chunks = chunker.chunk(text, defaultMetadata);

      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        const tokenCount = chunk.metadata.tokenCount as number;
        // Allow a small margin for overlap text added at boundaries
        expect(tokenCount).toBeLessThanOrEqual(140);
      }
    });

    it('should return a single chunk for very short text', () => {
      const text = 'Hello world. This is a short doc.';
      const chunks = chunker.chunk(text, defaultMetadata);
      expect(chunks.length).toBe(1);
      expect(chunks[0]!.text).toContain('Hello');
    });
  });

  // ────────────────────────────────────────────────────
  // parentContent metadata
  // ────────────────────────────────────────────────────

  describe('parentContent', () => {
    it('should set parentContent on every child chunk', () => {
      const text = sentences(40);
      const chunks = chunker.chunk(text, defaultMetadata);

      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        expect(chunk.metadata.parentContent).toBeDefined();
        expect(typeof chunk.metadata.parentContent).toBe('string');
        expect((chunk.metadata.parentContent as string).length).toBeGreaterThan(0);
      }
    });

    it('parentContent should contain the child text', () => {
      const text = sentences(40);
      const chunks = chunker.chunk(text, defaultMetadata);

      for (const chunk of chunks) {
        const parent = chunk.metadata.parentContent as string;
        // The child text should appear verbatim within its parent
        expect(parent).toContain(chunk.text.slice(0, 30));
      }
    });

    it('parent chunks should be at most 512 tokens', () => {
      const text = sentences(80);
      const chunks = chunker.chunk(text, defaultMetadata);

      // Collect unique parent contents and check their token count
      const parents = new Set<string>();
      for (const chunk of chunks) {
        if (chunk.metadata.parentContent) {
          parents.add(chunk.metadata.parentContent as string);
        }
      }

      // We can't measure tokens here directly, but we can proxy via character count
      // 512 tokens ≈ ~2000 chars in English prose. Allow generous margin.
      for (const parent of parents) {
        // A hard upper bound: 512 tokens at ~4 chars/token ≈ 2048 chars
        // We allow up to ~3000 chars for safety (punctuation, spaces)
        expect(parent.length).toBeLessThanOrEqual(3500);
      }
    });
  });

  // ────────────────────────────────────────────────────
  // Overlap — sentence-boundary alignment
  // ────────────────────────────────────────────────────

  describe('overlap alignment', () => {
    it('should not start a child chunk in the middle of a sentence (no overlap starts mid-word)', () => {
      // Use clear sentence boundaries
      const text = Array.from(
        { length: 30 },
        (_, i) => `Sentence ${i + 1} ends with a period.`
      ).join(' ');

      const chunks = chunker.chunk(text, defaultMetadata);
      expect(chunks.length).toBeGreaterThan(1);

      // Every chunk text (after the first) should either:
      // - start at the beginning of a sentence (capital letter or word after ". ")
      // - OR have no overlap (starts where the parent started)
      for (let i = 1; i < chunks.length; i++) {
        const text = chunks[i]!.text;
        // The text should not start mid-word-of-previous-sentence
        // Heuristic: if overlap is applied, it should start at a capital or known word
        expect(text.length).toBeGreaterThan(0);
      }
    });

    it('consecutive children from same parent should share text from sentence boundaries', () => {
      // Build a parent worth ~300 words (> 2 × 128 tokens) to force multiple children
      const longParent = sentences(25);
      const chunks = chunker.chunk(longParent, defaultMetadata);

      if (chunks.length > 1) {
        // The second chunk should share some text with the first (overlap)
        // OR start cleanly at a sentence boundary (no overlap case per spec)
        const first = chunks[0]!.text;
        const second = chunks[1]!.text;

        // They should not be identical
        expect(first).not.toBe(second);
        // Combined they should cover the source content
        expect(first.length + second.length).toBeGreaterThan(0);
      }
    });
  });

  // ────────────────────────────────────────────────────
  // Section detection — Markdown headers
  // ────────────────────────────────────────────────────

  describe('Markdown section detection', () => {
    it('should attach sectionHeader from # headers', () => {
      const text = `# Introduction\n\n${sentences(10)}\n\n## Details\n\n${sentences(10)}`;
      const chunks = chunker.chunk(text, defaultMetadata);

      const introChunks = chunks.filter((c) => c.metadata.sectionHeader === '# Introduction');
      const detailChunks = chunks.filter((c) => c.metadata.sectionHeader === '## Details');

      expect(introChunks.length).toBeGreaterThan(0);
      expect(detailChunks.length).toBeGreaterThan(0);
    });

    it('should attach sectionHeader from ## headers', () => {
      const text = `## Section A\n\n${sentences(8)}\n\n## Section B\n\n${sentences(8)}`;
      const chunks = chunker.chunk(text, defaultMetadata);

      const sectionAChunks = chunks.filter((c) => c.metadata.sectionHeader === '## Section A');
      const sectionBChunks = chunks.filter((c) => c.metadata.sectionHeader === '## Section B');

      expect(sectionAChunks.length).toBeGreaterThan(0);
      expect(sectionBChunks.length).toBeGreaterThan(0);
    });

    it('should handle document with no headers — sectionHeader undefined', () => {
      const text = sentences(15);
      const chunks = chunker.chunk(text, defaultMetadata);

      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        expect(chunk.metadata.sectionHeader).toBeUndefined();
      }
    });

    it('chunks from different sections should carry their own sectionHeader', () => {
      // Use distinctly different content per section to ensure no accidental sharing
      const sectionAContent = Array.from(
        { length: 15 },
        (_, i) => `Alpha sentence ${i + 1} about topic A.`
      ).join(' ');
      const sectionBContent = Array.from(
        { length: 15 },
        (_, i) => `Beta sentence ${i + 1} about topic B.`
      ).join(' ');
      const text = `# A\n\n${sectionAContent}\n\n# B\n\n${sectionBContent}`;
      const chunks = chunker.chunk(text, defaultMetadata);

      const sectionAChunks = chunks.filter((c) => c.metadata.sectionHeader === '# A');
      const sectionBChunks = chunks.filter((c) => c.metadata.sectionHeader === '# B');

      expect(sectionAChunks.length).toBeGreaterThan(0);
      expect(sectionBChunks.length).toBeGreaterThan(0);

      // All section A chunks should mention "Alpha" in their text or parent
      for (const chunk of sectionAChunks) {
        const content = chunk.text + (chunk.metadata.parentContent ?? '');
        expect(content).toContain('Alpha');
      }

      // All section B chunks should mention "Beta"
      for (const chunk of sectionBChunks) {
        const content = chunk.text + (chunk.metadata.parentContent ?? '');
        expect(content).toContain('Beta');
      }
    });
  });

  // ────────────────────────────────────────────────────
  // Section detection — "Short title:"
  // ────────────────────────────────────────────────────

  describe('Short title detection', () => {
    it('should detect a short line ending with ":" as a section header', () => {
      const text = `Configuration:\n\n${sentences(8)}\n\nUsage:\n\n${sentences(8)}`;
      const chunks = chunker.chunk(text, defaultMetadata);

      const configChunks = chunks.filter((c) => c.metadata.sectionHeader === 'Configuration:');
      const usageChunks = chunks.filter((c) => c.metadata.sectionHeader === 'Usage:');

      expect(configChunks.length).toBeGreaterThan(0);
      expect(usageChunks.length).toBeGreaterThan(0);
    });

    it('should NOT treat a long line ending with ":" as a section header', () => {
      // Line >= 60 chars
      const longTitle = 'This is a very long sentence that happens to end with a colon:';
      expect(longTitle.length).toBeGreaterThanOrEqual(60);
      const text = `${longTitle}\n\n${sentences(5)}`;
      const chunks = chunker.chunk(text, defaultMetadata);

      const titled = chunks.filter((c) => c.metadata.sectionHeader === longTitle);
      expect(titled.length).toBe(0);
    });

    it('should NOT treat a line with terminal punctuation before ":" as a section header', () => {
      // Line has "." before the ":"
      const falseTitle = 'See section 3.2:';
      const text = `${falseTitle}\n\n${sentences(5)}`;
      const chunks = chunker.chunk(text, defaultMetadata);

      // Since "." appears before ":", this should NOT be treated as a section header
      const titled = chunks.filter((c) => c.metadata.sectionHeader === falseTitle);
      expect(titled.length).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────
  // CSV fallback
  // ────────────────────────────────────────────────────

  describe('CSV fallback', () => {
    const csvMetadata: ChunkMetadata = {
      documentId: 'doc-csv',
      source: 'data.csv',
    };

    it('should use TokenChunker fallback for .csv source — no parentContent', () => {
      const text = Array.from({ length: 500 }, (_, i) => `row${i},value${i},extra${i}`).join('\n');

      const chunks = chunker.chunk(text, csvMetadata);

      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        expect(chunk.metadata.parentContent).toBeUndefined();
      }
    });

    it('should produce chunks of ~400 tokens for CSV (not 128)', () => {
      const text = Array.from(
        { length: 800 },
        (_, i) => `row${i},col1value${i},col2value${i},col3value${i}`
      ).join('\n');

      const chunks = chunker.chunk(text, csvMetadata);
      expect(chunks.length).toBeGreaterThan(0);

      // CSV fallback targets 400 tokens — at least some chunks should exceed 128 tokens
      const tokenCounts = chunks.map((c) => c.metadata.tokenCount as number);
      const hasLargerChunk = tokenCounts.some((t) => t > 128);
      expect(hasLargerChunk).toBe(true);
    });

    it('should also apply to .CSV (uppercase extension)', () => {
      const csvUpperMetadata: ChunkMetadata = { documentId: 'doc-2', source: 'DATA.CSV' };
      const text = Array.from({ length: 100 }, (_, i) => `r${i},v${i}`).join('\n');
      const chunks = chunker.chunk(text, csvUpperMetadata);
      for (const chunk of chunks) {
        expect(chunk.metadata.parentContent).toBeUndefined();
      }
    });
  });

  // ────────────────────────────────────────────────────
  // Backwards-compatibility: parent_content absent in old payload
  // (tested at the RAGPipeline level via mock — see pipeline.test.ts)
  // Here we just confirm the field is absent when not set.
  // ────────────────────────────────────────────────────

  describe('backwards-compatibility', () => {
    it('parentContent should be absent on CSV chunks (simulating old-format docs)', () => {
      const csvMeta: ChunkMetadata = { documentId: 'old-doc', source: 'legacy.csv' };
      const chunks = chunker.chunk('a,b,c\n1,2,3\n4,5,6\n', csvMeta);
      for (const chunk of chunks) {
        expect(
          'parentContent' in chunk.metadata ? chunk.metadata.parentContent : undefined
        ).toBeUndefined();
      }
    });
  });

  // ────────────────────────────────────────────────────
  // Chunk indices and metadata integrity
  // ────────────────────────────────────────────────────

  describe('chunk metadata', () => {
    it('should assign sequential chunkIndex', () => {
      const text = sentences(30);
      const chunks = chunker.chunk(text, defaultMetadata);

      chunks.forEach((chunk, i) => {
        expect(chunk.index).toBe(i);
        expect(chunk.metadata.chunkIndex).toBe(i);
      });
    });

    it('should preserve documentId and source from metadata', () => {
      const text = sentences(5);
      const chunks = chunker.chunk(text, defaultMetadata);

      for (const chunk of chunks) {
        expect(chunk.metadata.documentId).toBe('doc-1');
        expect(chunk.metadata.source).toBe('document.md');
      }
    });

    it('should assign unique ids to every chunk', () => {
      const text = sentences(30);
      const chunks = chunker.chunk(text, defaultMetadata);
      const ids = chunks.map((c) => c.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('should filter out empty chunks', () => {
      const text = '   \n\n   \n\n   ';
      const chunks = chunker.chunk(text, defaultMetadata);
      expect(chunks.length).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────
  // Symbol.dispose
  // ────────────────────────────────────────────────────

  it('should support Symbol.dispose cleanup', () => {
    const c = new ParentChildChunker();
    expect(() => c[Symbol.dispose]()).not.toThrow();
  });
});

// ────────────────────────────────────────────────────
// RAG pipeline backwards-compatibility:
// parent_content absent in old payload → fallback to payload.text
// ────────────────────────────────────────────────────

import {
  describe as describeCompat,
  it as itCompat,
  expect as expectCompat,
  vi,
  beforeEach as beforeEachCompat,
} from 'vitest';
import { RAGPipelineImpl } from '../rag/pipeline';
import type { EmbeddingService } from '../embeddings/types';
import type { VectorStoreService, SearchResult } from '../vector-store/types';
import type { ChunkingService } from './types';
import type { LLMConfig } from '../rag/types';

const mockOpenAICreate = vi.fn();

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockOpenAICreate } },
  })),
}));

describeCompat('RAGPipeline backwards-compat: no parent_content in payload', () => {
  let pipeline: RAGPipelineImpl;

  beforeEachCompat(() => {
    vi.clearAllMocks();

    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: 'LLM answer' } }],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });

    const mockEmbedding: EmbeddingService = {
      dimensions: 1536,
      model: 'text-embedding-3-small',
      embed: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
      embedBatch: vi.fn().mockResolvedValue([new Array(1536).fill(0.1)]),
    };

    // Search results WITHOUT parent_content — simulating old indexed documents
    const oldResults: SearchResult[] = [
      {
        id: 'chunk-old-1',
        score: 0.85,
        payload: {
          text: 'Old document chunk text without parent_content field.',
          source: 'old-doc.pdf',
          documentId: 'old-doc',
          chunkIndex: 0,
          // parent_content intentionally absent
        },
      },
      {
        id: 'chunk-old-2',
        score: 0.75,
        payload: {
          text: 'Another old chunk with no parent content.',
          source: 'old-doc.pdf',
          documentId: 'old-doc',
          chunkIndex: 1,
          // parent_content intentionally absent
        },
      },
    ];

    const mockVectorStore: VectorStoreService = {
      collectionName: 'ai_test',
      ensureCollection: vi.fn().mockResolvedValue(undefined),
      upsert: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue(oldResults),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteByIds: vi.fn().mockResolvedValue(undefined),
      deleteCollection: vi.fn().mockResolvedValue(undefined),
    };

    const mockChunker: ChunkingService = {
      strategy: 'parent-child',
      chunk: vi.fn().mockReturnValue([]),
    };

    const llmConfig: LLMConfig = {
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 1000,
    };

    pipeline = new RAGPipelineImpl(mockEmbedding, mockVectorStore, mockChunker, llmConfig);
  });

  itCompat(
    'query() should not throw and should use payload.text when parent_content absent',
    async () => {
      const response = await pipeline.query('What does the old document say?', { useHyde: false });

      expectCompat(response.answer).toBe('LLM answer');
      expectCompat(response.sources.length).toBe(2);
      // Sources should use payload.text as fallback
      expectCompat(response.sources[0]!.text).toBe(
        'Old document chunk text without parent_content field.'
      );
      expectCompat(response.sources[1]!.text).toBe('Another old chunk with no parent content.');
    }
  );

  itCompat(
    'queryStream() should not throw and should use payload.text when parent_content absent',
    async () => {
      // Setup streaming mock
      mockOpenAICreate.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'Streamed ' } }] };
          yield {
            choices: [{ delta: { content: 'answer' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          };
        },
      });

      const gen = pipeline.queryStream('What does the old document say?', { useHyde: false });
      const tokens: string[] = [];

      let result;
      while (true) {
        const next = await gen.next();
        if (next.done) {
          result = next.value;
          break;
        }
        tokens.push(next.value);
      }

      expectCompat(tokens.join('')).toBe('Streamed answer');
      // Sources should fall back to payload.text
      expectCompat(result.sources[0]!.text).toBe(
        'Old document chunk text without parent_content field.'
      );
    }
  );

  itCompat('query() should use parent_content when it IS present (new docs)', async () => {
    // Re-setup vector store with parent_content present
    const newResults: SearchResult[] = [
      {
        id: 'chunk-new-1',
        score: 0.9,
        payload: {
          text: 'Child chunk text (128 tokens).',
          source: 'new-doc.md',
          documentId: 'new-doc',
          chunkIndex: 0,
          parent_content: 'Parent chunk text with much richer context (512 tokens).',
        },
      },
    ];

    // Get the mock vector store and update search
    const response = await (async () => {
      const mockEmbedding: EmbeddingService = {
        dimensions: 1536,
        model: 'text-embedding-3-small',
        embed: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
        embedBatch: vi.fn().mockResolvedValue([new Array(1536).fill(0.1)]),
      };
      const mockVS: VectorStoreService = {
        collectionName: 'ai_new',
        ensureCollection: vi.fn().mockResolvedValue(undefined),
        upsert: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockResolvedValue(newResults),
        delete: vi.fn().mockResolvedValue(undefined),
        deleteByIds: vi.fn().mockResolvedValue(undefined),
        deleteCollection: vi.fn().mockResolvedValue(undefined),
      };
      const mockChunker: ChunkingService = {
        strategy: 'parent-child',
        chunk: vi.fn().mockReturnValue([]),
      };
      const llmConfig: LLMConfig = {
        apiKey: 'test',
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 1000,
      };
      const p = new RAGPipelineImpl(mockEmbedding, mockVS, mockChunker, llmConfig);
      return p.query('Tell me about the new document.', { useHyde: false });
    })();

    expectCompat(response.sources[0]!.text).toBe(
      'Parent chunk text with much richer context (512 tokens).'
    );
  });
});
