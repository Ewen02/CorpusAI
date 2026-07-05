import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { APIError } from 'openai';
import { RAGPipelineImpl } from './pipeline';
import { CohereReranker } from '../reranking/cohere-reranker';
import type { EmbeddingService } from '../embeddings/types';
import type { SparseVectorGenerator } from '../embeddings/sparse';
import type { VectorStoreService, SearchResult } from '../vector-store/types';
import type { ChunkingService, Chunk, ChunkMetadata } from '../chunking/types';
import type { Document, LLMConfig, ProgressCallback, ProcessingStage } from './types';

// Shared mock for OpenAI create function
const mockOpenAICreate = vi.fn();

// Mock OpenAI module — inclut les classes d'erreur utilisées par le pipeline
// (isRetryableLLMError / isNonRetryableError font des instanceof dessus).
vi.mock('openai', () => {
  class MockAPIError extends Error {
    status?: number;
    constructor(status?: number, message = 'api error') {
      super(message);
      this.status = status;
    }
  }
  class MockAPIConnectionError extends MockAPIError {
    constructor(message = 'Connection error.') {
      super(undefined, message);
    }
  }
  class MockRateLimitError extends MockAPIError {
    constructor(message = 'Rate limit exceeded.') {
      super(429, message);
    }
  }
  class MockInternalServerError extends MockAPIError {
    constructor(message = 'Internal server error.') {
      super(500, message);
    }
  }
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate,
        },
      },
    })),
    APIError: MockAPIError,
    APIConnectionError: MockAPIConnectionError,
    RateLimitError: MockRateLimitError,
    InternalServerError: MockInternalServerError,
  };
});

// Helper to create mock embedding (512 dimensions — Matryoshka)
const createMockEmbedding = (seed: number = 0): number[] => {
  return Array.from({ length: 512 }, (_, i) => Math.sin(seed + i) * 0.5);
};

// Helper to create mock sparse vector
const createMockSparseVector = () => ({
  indices: [1, 2, 3],
  values: [0.5, 0.3, 0.2],
});

// Helper to create mock chunks
const createMockChunks = (count: number, docId: string, source: string): Chunk[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${docId}_chunk_${i}`,
    text: `Chunk ${i} content for document ${docId}`,
    index: i,
    metadata: {
      documentId: docId,
      source,
      chunkIndex: i,
    },
  }));
};

// Helper to create mock search results
const createMockSearchResults = (count: number): SearchResult[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `chunk_${i}`,
    score: 0.9 - i * 0.1,
    payload: {
      text: `Result ${i} text content`,
      source: `document_${i}.pdf`,
      documentId: `doc_${i}`,
      chunkIndex: i,
    },
  }));
};

describe('RAGPipelineImpl', () => {
  let mockEmbeddingService: EmbeddingService;
  let mockSparseGenerator: SparseVectorGenerator;
  let mockVectorStore: VectorStoreService;
  let mockChunker: ChunkingService;
  let llmConfig: LLMConfig;
  let pipeline: RAGPipelineImpl;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock for OpenAI create
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: 'This is a mocked LLM response.' } }],
    });

    // Setup mock embedding service (512d Matryoshka)
    mockEmbeddingService = {
      dimensions: 512,
      model: 'text-embedding-3-small',
      embed: vi.fn().mockResolvedValue(createMockEmbedding(1)),
      embedBatch: vi
        .fn()
        .mockImplementation((texts: string[]) =>
          Promise.resolve(texts.map((_, i) => createMockEmbedding(i)))
        ),
    };

    // Setup mock sparse vector generator
    mockSparseGenerator = {
      generate: vi.fn().mockReturnValue(createMockSparseVector()),
      generateBatch: vi
        .fn()
        .mockImplementation((texts: string[]) => texts.map(() => createMockSparseVector())),
      dispose: vi.fn(),
    } as unknown as SparseVectorGenerator;

    // Setup mock vector store (global collection with hybrid search)
    mockVectorStore = {
      collectionName: 'corpus_vectors',
      ensureCollection: vi.fn().mockResolvedValue(undefined),
      upsert: vi.fn().mockResolvedValue(undefined),
      hybridSearch: vi.fn().mockResolvedValue(createMockSearchResults(3)),
      deleteByDocument: vi.fn().mockResolvedValue(undefined),
      deleteByAI: vi.fn().mockResolvedValue(undefined),
    };

    // Setup mock chunker
    mockChunker = {
      strategy: 'mock',
      chunk: vi.fn().mockImplementation((text: string, metadata: ChunkMetadata) => {
        return createMockChunks(3, metadata.documentId, metadata.source);
      }),
    };

    // Setup LLM config
    llmConfig = {
      apiKey: 'test-api-key',
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 1000,
    };

    // Create pipeline (aiId, embeddings, vectorStore, sparseGenerator, chunker, llmConfig)
    pipeline = new RAGPipelineImpl(
      'test-ai-id',
      mockEmbeddingService,
      mockVectorStore,
      mockSparseGenerator,
      mockChunker,
      llmConfig
    );
  });

  // ==========================================================================
  // INDEX TESTS
  // ==========================================================================
  describe('index()', () => {
    const testDocuments: Document[] = [
      { id: 'doc1', content: 'Document 1 content', source: 'doc1.pdf' },
      { id: 'doc2', content: 'Document 2 content', source: 'doc2.pdf' },
    ];

    it('should index documents through chunking → embedding → storage', async () => {
      const result = await pipeline.index(testDocuments);

      // Verify chunking was called for each document
      expect(mockChunker.chunk).toHaveBeenCalledTimes(2);
      expect(mockChunker.chunk).toHaveBeenCalledWith('Document 1 content', {
        documentId: 'doc1',
        source: 'doc1.pdf',
      });

      // Verify embedding was called (2 docs * 3 chunks each = 6 texts)
      expect(mockEmbeddingService.embedBatch).toHaveBeenCalled();

      // Verify vector store operations
      expect(mockVectorStore.ensureCollection).toHaveBeenCalled();
      expect(mockVectorStore.upsert).toHaveBeenCalled();

      // Verify result
      expect(result.documentsIndexed).toBe(2);
      expect(result.chunksCreated).toBe(6); // 2 docs * 3 chunks
      expect(result.chunkIds).toHaveLength(6);
    });

    it('should call progress callback with correct stages', async () => {
      const progressCalls: Array<{ stage: ProcessingStage; progress: number; details?: string }> =
        [];
      const onProgress: ProgressCallback = (stage, progress, details) => {
        progressCalls.push({ stage, progress, details });
      };

      await pipeline.index(testDocuments, { onProgress });

      // Should have chunking, embedding, and storing stages
      const stages = progressCalls.map((c) => c.stage);
      expect(stages).toContain('chunking');
      expect(stages).toContain('embedding');
      expect(stages).toContain('storing');

      // Verify progress ranges
      const chunkingCalls = progressCalls.filter((c) => c.stage === 'chunking');
      const embeddingCalls = progressCalls.filter((c) => c.stage === 'embedding');
      const storingCalls = progressCalls.filter((c) => c.stage === 'storing');

      // Chunking: 0-10%
      expect(chunkingCalls.some((c) => c.progress <= 10)).toBe(true);

      // Embedding: 10-80%
      expect(embeddingCalls.some((c) => c.progress >= 10 && c.progress <= 80)).toBe(true);

      // Storing: 80-100%
      expect(storingCalls.some((c) => c.progress >= 80)).toBe(true);
      expect(storingCalls.some((c) => c.progress === 100)).toBe(true);
    });

    it('should return zero chunks for empty documents', async () => {
      // Mock chunker to return empty array
      (mockChunker.chunk as Mock).mockReturnValue([]);

      const result = await pipeline.index(testDocuments);

      expect(result.documentsIndexed).toBe(2);
      expect(result.chunksCreated).toBe(0);
      expect(result.chunkIds).toHaveLength(0);

      // Should not call embedding or upsert for empty chunks
      expect(mockEmbeddingService.embedBatch).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should batch embeddings when exceeding batch size', async () => {
      // Create many chunks to trigger batching (batch size is 100)
      const manyChunks = createMockChunks(150, 'doc1', 'doc1.pdf');
      (mockChunker.chunk as Mock).mockReturnValue(manyChunks);

      const singleDoc: Document[] = [{ id: 'doc1', content: 'Large document', source: 'doc1.pdf' }];

      await pipeline.index(singleDoc);

      // Should be called twice: 100 + 50
      expect(mockEmbeddingService.embedBatch).toHaveBeenCalledTimes(2);
    });

    it('should include document metadata in chunks', async () => {
      const docsWithMetadata: Document[] = [
        {
          id: 'doc1',
          content: 'Content',
          source: 'doc.pdf',
          metadata: { author: 'John', category: 'tech' },
        },
      ];

      await pipeline.index(docsWithMetadata);

      expect(mockChunker.chunk).toHaveBeenCalledWith('Content', {
        documentId: 'doc1',
        source: 'doc.pdf',
        author: 'John',
        category: 'tech',
      });
    });

    // -------------------------------------------------------------------------
    // Context Enrichment tests
    // -------------------------------------------------------------------------
    describe('context enrichment', () => {
      const singleDoc: Document[] = [
        { id: 'doc1', content: 'Document content for enrichment test', source: 'doc1.pdf' },
      ];

      it('should not call enrichment API when enableContextEnrichment is false (default)', async () => {
        await pipeline.index(singleDoc);

        // mockOpenAICreate is shared — ensure it was NOT called during indexing
        // (only LLM calls for query would use it, not indexing)
        expect(mockOpenAICreate).not.toHaveBeenCalled();
      });

      it('should batch enrichment into a single LLM call for the whole batch', async () => {
        // Batched enrichment: one call returns a JSON map keyed by chunk index.
        mockOpenAICreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  '0': 'This excerpt is in section intro.',
                  '1': 'This excerpt is in section intro.',
                  '2': 'This excerpt is in section intro.',
                }),
              },
            },
          ],
        });

        await pipeline.index(singleDoc, {
          enableContextEnrichment: true,
          contextEnrichmentConfig: { concurrency: 2 },
        });

        // 3 chunks fit in a single batch (ENRICHMENT_BATCH_SIZE=12) → 1 enrichment call
        expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
        expect(mockOpenAICreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'gpt-4o-mini',
            temperature: 0,
            response_format: { type: 'json_object' },
            messages: expect.arrayContaining([expect.objectContaining({ role: 'user' })]),
          })
        );
      });

      it('should use enriched text for embedding but store original chunk.text in payload', async () => {
        const contextPhrase = 'This excerpt describes the introduction.';
        mockOpenAICreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  '0': contextPhrase,
                  '1': contextPhrase,
                  '2': contextPhrase,
                }),
              },
            },
          ],
        });

        await pipeline.index(singleDoc, {
          enableContextEnrichment: true,
          contextEnrichmentConfig: { concurrency: 5 },
        });

        // embedBatch should have been called with enriched text (contextPhrase + \n + chunk.text)
        const embedBatchCalls = (mockEmbeddingService.embedBatch as Mock).mock.calls;
        const embeddedTexts: string[] = embedBatchCalls.flatMap(
          (call: string[][]) => call[0] ?? []
        );
        expect(embeddedTexts.every((t) => t.startsWith(contextPhrase))).toBe(true);

        // payload stored in Qdrant should have the original chunk.text, NOT the enriched text
        const upsertCalls = (mockVectorStore.upsert as Mock).mock.calls;
        const storedPayloads = upsertCalls.flatMap((call: { payload: { text: string } }[][]) =>
          (call[0] ?? []).map((p) => p.payload.text)
        );
        // Original chunk text starts with 'Chunk' (from createMockChunks helper)
        expect(storedPayloads.every((t) => t.startsWith('Chunk'))).toBe(true);
        // Original chunk text should NOT contain the context phrase
        expect(storedPayloads.every((t) => !t.includes(contextPhrase))).toBe(true);
      });

      it('should fallback to original chunk.text when enrichment API call fails', async () => {
        // All enrichment calls fail — non-429 errors are NOT retried by enrichWithRetry
        mockOpenAICreate.mockRejectedValue(new Error('Invalid API key'));

        // Should NOT throw — indexing should complete with original texts
        const result = await pipeline.index(singleDoc, {
          enableContextEnrichment: true,
          contextEnrichmentConfig: { concurrency: 1 },
        });

        expect(result.chunksCreated).toBe(3);

        // embedBatch should still be called with 3 texts
        const embedBatchCalls = (mockEmbeddingService.embedBatch as Mock).mock.calls;
        const embeddedTexts: string[] = embedBatchCalls.flatMap(
          (call: string[][]) => call[0] ?? []
        );
        expect(embeddedTexts).toHaveLength(3);

        // All chunks should use original text (fallback)
        expect(embeddedTexts[0]).toMatch(/^Chunk 0/);
        expect(embeddedTexts[1]).toMatch(/^Chunk 1/);
        expect(embeddedTexts[2]).toMatch(/^Chunk 2/);
      });

      it('should fallback to original chunk.text when enrichment returns empty response', async () => {
        mockOpenAICreate.mockResolvedValue({
          choices: [{ message: { content: '' } }],
        });

        await pipeline.index(singleDoc, { enableContextEnrichment: true });

        // All texts should be original chunk texts (no empty prefix added)
        const embedBatchCalls = (mockEmbeddingService.embedBatch as Mock).mock.calls;
        const embeddedTexts: string[] = embedBatchCalls.flatMap(
          (call: string[][]) => call[0] ?? []
        );
        expect(embeddedTexts.every((t) => t.startsWith('Chunk'))).toBe(true);
      });

      it('should emit enriching stage in progress callback', async () => {
        mockOpenAICreate.mockResolvedValue({
          choices: [{ message: { content: 'Context.' } }],
        });

        const stages: string[] = [];
        await pipeline.index(singleDoc, {
          enableContextEnrichment: true,
          onProgress: (stage) => {
            stages.push(stage);
          },
        });

        expect(stages).toContain('enriching');
        // enriching should appear after chunking and before embedding
        const enrichingIdx = stages.indexOf('enriching');
        const chunkingIdx = stages.lastIndexOf('chunking');
        const embeddingIdx = stages.indexOf('embedding');
        expect(enrichingIdx).toBeGreaterThan(chunkingIdx);
        expect(enrichingIdx).toBeLessThan(embeddingIdx);
      });

      it('should use custom model from contextEnrichmentConfig', async () => {
        mockOpenAICreate.mockResolvedValue({
          choices: [{ message: { content: 'Context.' } }],
        });

        await pipeline.index(singleDoc, {
          enableContextEnrichment: true,
          contextEnrichmentConfig: { model: 'gpt-4o', concurrency: 5 },
        });

        expect(mockOpenAICreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o' }));
      });

      it('should truncate document content in enrichment prompt', async () => {
        // Create a document larger than maxDocumentTokens × 4 chars
        const longContent = 'A'.repeat(30000); // > 24000 chars (6000 tokens × 4)
        const longDoc: Document[] = [{ id: 'doc1', content: longContent, source: 'big.pdf' }];

        mockOpenAICreate.mockResolvedValue({
          choices: [{ message: { content: 'Context.' } }],
        });

        await pipeline.index(longDoc, {
          enableContextEnrichment: true,
          contextEnrichmentConfig: { maxDocumentTokens: 6000 },
        });

        // The prompt sent to OpenAI should NOT contain the full 30000 char document
        const promptContent: string =
          mockOpenAICreate.mock.calls[0]?.[0]?.messages?.[0]?.content ?? '';
        // Document section in prompt should be <= ~25000 chars (some buffer for truncation)
        expect(promptContent.length).toBeLessThan(30000);
      });
    });
  });

  // ==========================================================================
  // QUERY TESTS
  // ==========================================================================
  describe('query()', () => {
    it('should execute full query pipeline: embed → search → rerank → LLM', async () => {
      const response = await pipeline.query('What is TypeScript?', { useHyde: false });

      // Verify embedding was called for the question
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith('What is TypeScript?');

      // Verify vector search
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ indices: expect.any(Array), values: expect.any(Array) }),
        'test-ai-id',
        expect.objectContaining({
          limit: 5,
          scoreThreshold: 0.4,
          withPayload: true,
        })
      );

      // RRF fusion is done server-side in Qdrant, no client-side reranker call

      // Verify LLM was called
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 1000,
        })
      );

      // Verify response structure
      expect(response.answer).toBe('This is a mocked LLM response.');
      expect(response.sources).toHaveLength(3);
      expect(response.context).toContain('[Source:');
      expect(response.metrics).toBeDefined();
    });

    it('should call LLM even when no results found', async () => {
      (mockVectorStore.hybridSearch as Mock).mockResolvedValue([]);

      const response = await pipeline.query('Unknown question', { useHyde: false });

      // LLM is always called, even without results
      expect(mockOpenAICreate).toHaveBeenCalled();

      // System prompt contains the unavailable context marker
      const callArgs = mockOpenAICreate.mock.calls[0]![0];
      expect(callArgs.messages[0].content).toContain('Aucun contexte disponible.');

      expect(response.answer).toBe('This is a mocked LLM response.');
      expect(response.sources).toHaveLength(0);
      expect(response.context).toBe('');
    });

    it('should include metrics with timing breakdown', async () => {
      const response = await pipeline.query('Test question', { useHyde: false });

      expect(response.metrics).toBeDefined();
      expect(response.metrics!.embeddingMs).toBeGreaterThanOrEqual(0);
      expect(response.metrics!.searchMs).toBeGreaterThanOrEqual(0);
      expect(response.metrics!.rerankMs).toBeGreaterThanOrEqual(0);
      expect(response.metrics!.llmMs).toBeGreaterThanOrEqual(0);
      expect(response.metrics!.totalMs).toBeGreaterThanOrEqual(0);

      // Total should be >= sum of parts
      const sumOfParts =
        response.metrics!.embeddingMs +
        response.metrics!.searchMs +
        response.metrics!.rerankMs +
        response.metrics!.llmMs;
      expect(response.metrics!.totalMs).toBeGreaterThanOrEqual(sumOfParts * 0.9); // Allow small variance
    });

    it('should work without reranker', async () => {
      // Create pipeline without reranker
      const pipelineNoRerank = new RAGPipelineImpl(
        'test-ai-id',
        mockEmbeddingService,
        mockVectorStore,
        mockSparseGenerator,
        mockChunker,
        llmConfig
        // No reranker
      );

      const response = await pipelineNoRerank.query('Test question', { useHyde: false });
      expect(response.answer).toBe('This is a mocked LLM response.');
      expect(response.sources).toHaveLength(3);
    });

    it('should respect query options', async () => {
      await pipeline.query('Test', {
        topK: 10,
        scoreThreshold: 0.7,
        includeSources: false,
        useHyde: false,
      });

      expect(mockVectorStore.hybridSearch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ indices: expect.any(Array), values: expect.any(Array) }),
        'test-ai-id',
        expect.objectContaining({
          limit: 10,
          scoreThreshold: 0.7,
        })
      );
    });

    it('should exclude sources when includeSources is false', async () => {
      const response = await pipeline.query('Test', { includeSources: false, useHyde: false });

      expect(response.sources).toHaveLength(0);
    });

    it('should use custom system prompt when provided', async () => {
      const customConfig: LLMConfig = {
        ...llmConfig,
        systemPrompt: 'You are a helpful assistant specialized in cooking.',
      };

      const customPipeline = new RAGPipelineImpl(
        'test-ai-id',
        mockEmbeddingService,
        mockVectorStore,
        mockSparseGenerator,
        mockChunker,
        customConfig
      );

      await customPipeline.query('How to make pasta?', { useHyde: false });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('cooking'),
            }),
          ]),
        })
      );
    });
  });

  // ==========================================================================
  // QUERY STREAM TESTS
  // ==========================================================================
  describe('queryStream()', () => {
    it('should yield tokens and return final response', async () => {
      // Mock streaming response
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'Hello' } }] };
          yield { choices: [{ delta: { content: ' ' } }] };
          yield { choices: [{ delta: { content: 'World' } }] };
        },
      };

      mockOpenAICreate.mockResolvedValue(mockStream);

      const tokens: string[] = [];
      const generator = pipeline.queryStream('Test question', { useHyde: false });

      let result = await generator.next();
      while (!result.done) {
        tokens.push(result.value as string);
        result = await generator.next();
      }

      // Verify tokens were yielded
      expect(tokens).toEqual(['Hello', ' ', 'World']);

      // Verify final response
      const finalResponse = result.value as { answer: string; sources: unknown[] };
      expect(finalResponse.answer).toBe('Hello World');
      expect(finalResponse.sources).toHaveLength(3);
    });

    it('should stream LLM response even when no results found', async () => {
      (mockVectorStore.hybridSearch as Mock).mockResolvedValue([]);

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'No context response' } }] };
        },
      };
      mockOpenAICreate.mockResolvedValue(mockStream);

      const generator = pipeline.queryStream('Unknown question', { useHyde: false });

      const tokens: string[] = [];
      let result = await generator.next();
      while (!result.done) {
        tokens.push(result.value as string);
        result = await generator.next();
      }

      // LLM is always called, should yield streamed tokens
      expect(mockOpenAICreate).toHaveBeenCalled();
      expect(tokens).toEqual(['No context response']);

      const finalResponse = result.value as { sources: unknown[]; context: string };
      expect(finalResponse.sources).toHaveLength(0);
      expect(finalResponse.context).toBe('');
    });

    it('should handle empty delta content', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'A' } }] };
          yield { choices: [{ delta: {} }] }; // Empty delta
          yield { choices: [{ delta: { content: undefined } }] }; // Undefined content
          yield { choices: [{ delta: { content: 'B' } }] };
        },
      };

      mockOpenAICreate.mockResolvedValue(mockStream);

      const tokens: string[] = [];
      const generator = pipeline.queryStream('Test', { useHyde: false });

      let result = await generator.next();
      while (!result.done) {
        tokens.push(result.value as string);
        result = await generator.next();
      }

      // Should handle empty/undefined gracefully
      expect(tokens.filter((t) => t)).toEqual(['A', 'B']);

      const finalResponse = result.value as { answer: string };
      expect(finalResponse.answer).toBe('AB');
    });
  });

  // ==========================================================================
  // DELETE DOCUMENTS TESTS
  // ==========================================================================
  describe('deleteDocuments()', () => {
    it('should delete documents by their IDs', async () => {
      await pipeline.deleteDocuments(['doc1', 'doc2', 'doc3']);

      expect(mockVectorStore.deleteByDocument).toHaveBeenCalledTimes(3);

      // Verify each call includes aiId and documentId
      expect(mockVectorStore.deleteByDocument).toHaveBeenCalledWith('test-ai-id', 'doc1');
      expect(mockVectorStore.deleteByDocument).toHaveBeenCalledWith('test-ai-id', 'doc2');
      expect(mockVectorStore.deleteByDocument).toHaveBeenCalledWith('test-ai-id', 'doc3');
    });

    it('should handle empty document list', async () => {
      await pipeline.deleteDocuments([]);

      expect(mockVectorStore.deleteByDocument).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // CONTEXT BUILDING TESTS
  // ==========================================================================
  describe('context building', () => {
    it('should format context with source citations', async () => {
      const customResults: SearchResult[] = [
        {
          id: 'chunk1',
          score: 0.95,
          payload: { text: 'First chunk content', source: 'doc1.pdf', documentId: 'doc1' },
        },
        {
          id: 'chunk2',
          score: 0.85,
          payload: { text: 'Second chunk content', source: 'doc2.pdf', documentId: 'doc2' },
        },
      ];

      (mockVectorStore.hybridSearch as Mock).mockResolvedValue(customResults);

      const response = await pipeline.query('Test', { useHyde: false });

      // Verify context format
      expect(response.context).toContain('[Source: doc1.pdf]');
      expect(response.context).toContain('First chunk content');
      expect(response.context).toContain('[Source: doc2.pdf]');
      expect(response.context).toContain('Second chunk content');
      expect(response.context).toContain('---');
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('edge cases', () => {
    it('should handle LLM returning empty response', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      });

      const response = await pipeline.query('Test', { useHyde: false });

      expect(response.answer).toBe('');
    });

    it('should handle LLM returning null content', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const response = await pipeline.query('Test', { useHyde: false });

      expect(response.answer).toBe('');
    });

    it('should handle single document indexing', async () => {
      const singleDoc: Document[] = [{ id: 'single', content: 'Only one', source: 'single.pdf' }];

      const result = await pipeline.index(singleDoc);

      expect(result.documentsIndexed).toBe(1);
    });

    it('should use topK=5 default without CohereReranker', async () => {
      // Pipeline without CohereReranker — topK should default to 5
      await pipeline.query('Test question', { useHyde: false });

      expect(mockVectorStore.hybridSearch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ indices: expect.any(Array), values: expect.any(Array) }),
        'test-ai-id',
        expect.objectContaining({ limit: 5 })
      );
    });

    it('should use topK=10 default with CohereReranker', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            results: [
              { index: 0, relevance_score: 0.95 },
              { index: 1, relevance_score: 0.8 },
              { index: 2, relevance_score: 0.6 },
            ],
          }),
        })
      );

      const cohereResults = createMockSearchResults(10);
      (mockVectorStore.hybridSearch as Mock).mockResolvedValue(cohereResults);

      const coherePipeline = new RAGPipelineImpl(
        'test-ai-id',
        mockEmbeddingService,
        mockVectorStore,
        mockSparseGenerator,
        mockChunker,
        llmConfig,
        new CohereReranker({ apiKey: 'test-cohere-key' })
      );

      await coherePipeline.query('Test question');

      expect(mockVectorStore.hybridSearch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ indices: expect.any(Array), values: expect.any(Array) }),
        'test-ai-id',
        expect.objectContaining({ limit: 10 })
      );

      vi.unstubAllGlobals();
    });
  });

  // ==========================================================================
  // COHERE RERANKER TESTS
  // ==========================================================================
  describe('CohereReranker integration', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      vi.stubGlobal('fetch', mockFetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { index: 2, relevance_score: 0.98 },
            { index: 0, relevance_score: 0.75 },
            { index: 1, relevance_score: 0.5 },
          ],
        }),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should call Cohere API with correct payload', async () => {
      // Use low scores so shouldRerank triggers (avg < 0.8)
      const lowScoreResults = createMockSearchResults(3).map((r, i) => ({
        ...r,
        score: 0.6 - i * 0.1,
      }));
      (mockVectorStore.hybridSearch as Mock).mockResolvedValue(lowScoreResults);

      const coherePipeline = new RAGPipelineImpl(
        'test-ai-id',
        mockEmbeddingService,
        mockVectorStore,
        mockSparseGenerator,
        mockChunker,
        llmConfig,
        new CohereReranker({ apiKey: 'test-cohere-key', topN: 3 })
      );

      await coherePipeline.query('What is TypeScript?', { useHyde: false });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cohere.com/v1/rerank',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-cohere-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"query":"What is TypeScript?"'),
        })
      );
    });

    it('should rerank results using Cohere scores and return top N', async () => {
      const searchResults = createMockSearchResults(3).map((r, i) => ({
        ...r,
        score: 0.6 - i * 0.1,
      }));
      (mockVectorStore.hybridSearch as Mock).mockResolvedValue(searchResults);

      const coherePipeline = new RAGPipelineImpl(
        'test-ai-id',
        mockEmbeddingService,
        mockVectorStore,
        mockSparseGenerator,
        mockChunker,
        llmConfig,
        new CohereReranker({ apiKey: 'test-cohere-key', topN: 3 })
      );

      const response = await coherePipeline.query('Test question', { topN: 3, useHyde: false });

      // Sources should be in Cohere rank order (index 2 first, then 0, then 1)
      expect(response.sources).toHaveLength(3);
      expect(response.sources[0]?.chunkId).toBe('chunk_2');
      expect(response.sources[1]?.chunkId).toBe('chunk_0');
      expect(response.sources[2]?.chunkId).toBe('chunk_1');
    });

    it('should fallback to semantic order when Cohere API fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const searchResults = createMockSearchResults(3).map((r, i) => ({
        ...r,
        score: 0.6 - i * 0.1,
      }));
      (mockVectorStore.hybridSearch as Mock).mockResolvedValue(searchResults);

      const coherePipeline = new RAGPipelineImpl(
        'test-ai-id',
        mockEmbeddingService,
        mockVectorStore,
        mockSparseGenerator,
        mockChunker,
        llmConfig,
        new CohereReranker({ apiKey: 'test-cohere-key' })
      );

      // Should NOT throw — silent fallback to semantic order
      const response = await coherePipeline.query('Test question', { useHyde: false });

      // Results returned in original Qdrant order (semantic)
      expect(response.sources).toHaveLength(3);
      expect(response.sources[0]?.score).toBeCloseTo(0.6, 1);
    });

    it('should fallback to semantic order when Cohere returns HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({}),
      });

      const searchResults = createMockSearchResults(3).map((r, i) => ({
        ...r,
        score: 0.6 - i * 0.1,
      }));
      (mockVectorStore.hybridSearch as Mock).mockResolvedValue(searchResults);

      const coherePipeline = new RAGPipelineImpl(
        'test-ai-id',
        mockEmbeddingService,
        mockVectorStore,
        mockSparseGenerator,
        mockChunker,
        llmConfig,
        new CohereReranker({ apiKey: 'test-cohere-key' })
      );

      // Should NOT throw — silent fallback
      const response = await coherePipeline.query('Test question', { useHyde: false });
      expect(response.answer).toBe('This is a mocked LLM response.');
    });

    it('should respect topN option and slice results to topN', async () => {
      const searchResults = createMockSearchResults(3);
      (mockVectorStore.hybridSearch as Mock).mockResolvedValue(searchResults);

      const coherePipeline = new RAGPipelineImpl(
        'test-ai-id',
        mockEmbeddingService,
        mockVectorStore,
        mockSparseGenerator,
        mockChunker,
        llmConfig,
        new CohereReranker({ apiKey: 'test-cohere-key', topN: 3 })
      );

      const response = await coherePipeline.query('Test question', { topN: 2, useHyde: false });

      // topN=2 in QueryOptions overrides the CohereReranker default of 3
      expect(response.sources).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle search result with missing payload fields', async () => {
      const incompleteResults: SearchResult[] = [
        { id: 'chunk1', score: 0.9, payload: {} }, // Missing text and source
      ];

      (mockVectorStore.hybridSearch as Mock).mockResolvedValue(incompleteResults);

      const response = await pipeline.query('Test', { useHyde: false });

      // Should handle gracefully
      expect(response.sources[0]?.documentSource).toBe('unknown');
      expect(response.sources[0]?.text).toBe('');
    });
  });

  // ==========================================================================
  // HYDE TESTS
  // ==========================================================================
  describe('HyDE (Hypothetical Document Embeddings)', () => {
    it('should activate HyDE for short question (< 8 words, no keyword)', async () => {
      // "TypeScript benefits" = 2 words, no keyword → HyDE active
      // mockOpenAICreate is called twice: once for HyDE doc generation, once for final LLM answer
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'TypeScript is a typed superset of JavaScript.' } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'This is a mocked LLM response.' } }],
        });

      await pipeline.query('TypeScript benefits', { useHyde: undefined });

      // embed called twice (question + hypothetical doc)
      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(2);
      // search called twice (one per vector)
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(2);
    });

    it('should NOT activate HyDE for question with specific keyword', async () => {
      // "Comment TypeScript améliore la productivité" — contains "comment" keyword → no HyDE
      await pipeline.query('Comment TypeScript améliore la productivité des développeurs');

      // embed called once, search called once
      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(1);
    });

    it('should NOT activate HyDE for short question WITH keyword', async () => {
      // "Pourquoi TypeScript" = 2 words but contains "pourquoi" → no HyDE
      await pipeline.query('Pourquoi TypeScript');

      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(1);
    });

    it('should force HyDE when useHyde=true, even for long specific question', async () => {
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Hypothetical answer to long question.' } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'This is a mocked LLM response.' } }],
        });

      await pipeline.query(
        'Comment TypeScript améliore la productivité des développeurs expérimentés',
        { useHyde: true }
      );

      // HyDE forced: embed x2, search x2
      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(2);
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(2);
    });

    it('should skip HyDE when useHyde=false, even for short question', async () => {
      await pipeline.query('TypeScript', { useHyde: false });

      // Standard path: embed x1, search x1
      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate results keeping best score', async () => {
      // search for question vector returns chunk_0 (score=0.9) + chunk_1 (score=0.8)
      // search for hypo vector returns chunk_0 (score=0.95) + chunk_2 (score=0.7)
      // After dedup: chunk_0 score=0.95, chunk_1 score=0.8, chunk_2 score=0.7
      const questionResults: SearchResult[] = [
        {
          id: 'chunk_0',
          score: 0.9,
          payload: { text: 'text 0', source: 'doc0.pdf', documentId: 'doc0' },
        },
        {
          id: 'chunk_1',
          score: 0.8,
          payload: { text: 'text 1', source: 'doc1.pdf', documentId: 'doc1' },
        },
      ];
      const hypoResults: SearchResult[] = [
        {
          id: 'chunk_0',
          score: 0.95,
          payload: { text: 'text 0', source: 'doc0.pdf', documentId: 'doc0' },
        },
        {
          id: 'chunk_2',
          score: 0.7,
          payload: { text: 'text 2', source: 'doc2.pdf', documentId: 'doc2' },
        },
      ];

      (mockVectorStore.hybridSearch as Mock)
        .mockResolvedValueOnce(questionResults)
        .mockResolvedValueOnce(hypoResults);

      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Hypothetical answer.' } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'This is a mocked LLM response.' } }],
        });

      // Force HyDE, disable reranker
      const pipelineNoRerank = new RAGPipelineImpl(
        'test-ai-id',
        mockEmbeddingService,
        mockVectorStore,
        mockSparseGenerator,
        mockChunker,
        llmConfig
      );

      const response = await pipelineNoRerank.query('TypeScript', { useHyde: true, topN: 3 });

      // chunk_0 should have score=0.95 (best from the two searches)
      expect(response.sources[0]?.chunkId).toBe('chunk_0');
      expect(response.sources[0]?.score).toBeCloseTo(0.95, 2);
      expect(response.sources).toHaveLength(3);
    });

    it('should fallback to standard search when LLM call fails during HyDE', async () => {
      // First LLM call (HyDE doc generation) throws
      mockOpenAICreate.mockRejectedValueOnce(new Error('LLM unavailable')).mockResolvedValueOnce({
        choices: [{ message: { content: 'This is a mocked LLM response.' } }],
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await pipeline.query('TypeScript', { useHyde: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[RAG] HyDE failed, falling back to standard search:',
        expect.stringContaining('LLM unavailable')
      );

      // Fallback: embed x1, search x1
      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(1);
      expect(response.answer).toBe('This is a mocked LLM response.');

      consoleSpy.mockRestore();
    });

    it('should fallback to question when LLM returns empty string', async () => {
      // LLM returns empty string for HyDE doc → fallback to question
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: '' } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'This is a mocked LLM response.' } }],
        });

      await pipeline.query('TypeScript', { useHyde: true });

      // embed should still be called twice (question + empty fallback → question again)
      // Both vectors come from the question text
      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(2);
      // Second embed call should use the original question (fallback)
      expect(mockEmbeddingService.embed).toHaveBeenNthCalledWith(2, 'TypeScript');
    });

    it('should set hydeMs in metrics when HyDE is used', async () => {
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Hypothetical answer.' } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'This is a mocked LLM response.' } }],
        });

      const response = await pipeline.query('TypeScript', { useHyde: true });

      expect(response.metrics?.hydeMs).toBeDefined();
      expect(response.metrics?.hydeMs).toBeGreaterThanOrEqual(0);
    });

    it('should NOT activate HyDE for short English question with keyword', async () => {
      // "What is TypeScript" = 3 mots MAIS keyword EN "what" → pas de HyDE
      await pipeline.query('What is TypeScript');

      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(1);
    });

    it('should NOT activate HyDE for short French question with « où »', async () => {
      // Régression : \b ASCII ne matche jamais après « ù » — l'ancienne regex
      // laissait cette question (5 mots) déclencher HyDE à tort.
      await pipeline.query('où se trouve le siège');

      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // PARENT DEDUPLICATION TESTS
  // ==========================================================================
  describe('parent context deduplication', () => {
    it('should deduplicate results sharing the same parent content', async () => {
      const sharedParent = 'Parent block content shared by two children';
      const results: SearchResult[] = [
        {
          id: 'c1',
          score: 0.9,
          payload: {
            text: 'child 1',
            parent_content: sharedParent,
            source: 'doc.pdf',
            documentId: 'd1',
          },
        },
        {
          id: 'c2',
          score: 0.8,
          payload: {
            text: 'child 2',
            parent_content: sharedParent,
            source: 'doc.pdf',
            documentId: 'd1',
          },
        },
        {
          id: 'c3',
          score: 0.7,
          payload: {
            text: 'child 3',
            parent_content: 'Another distinct parent block',
            source: 'doc.pdf',
            documentId: 'd1',
          },
        },
        {
          id: 'c4',
          score: 0.6,
          payload: {
            text: 'child 4',
            parent_content: 'Third distinct parent block',
            source: 'doc.pdf',
            documentId: 'd1',
          },
        },
      ];
      (mockVectorStore.hybridSearch as Mock).mockResolvedValue(results);

      const response = await pipeline.query('Test', { useHyde: false, topN: 3 });

      // c2 (même parent que c1) est écarté, c4 remonte pour compléter le topN
      expect(response.sources.map((s) => s.chunkId)).toEqual(['c1', 'c3', 'c4']);
      // Le parent partagé n'apparaît qu'UNE fois dans le contexte LLM
      const occurrences = response.context.split(sharedParent).length - 1;
      expect(occurrences).toBe(1);
    });

    it('should keep all results when parents are distinct', async () => {
      const results: SearchResult[] = ['A', 'B', 'C'].map((p, i) => ({
        id: `c${i}`,
        score: 0.9 - i * 0.1,
        payload: {
          text: `child ${i}`,
          parent_content: `Parent ${p}`,
          source: 'doc.pdf',
          documentId: 'd1',
        },
      }));
      (mockVectorStore.hybridSearch as Mock).mockResolvedValue(results);

      const response = await pipeline.query('Test', { useHyde: false, topN: 3 });

      expect(response.sources).toHaveLength(3);
    });
  });

  // ==========================================================================
  // FOLLOW-UP CONDENSATION TESTS
  // ==========================================================================
  // ==========================================================================
  // MULTI-QUERY TESTS
  // ==========================================================================
  describe('multi-query (composite questions)', () => {
    it('decomposes a composite question and merges parallel searches', async () => {
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  queries: [
                    'Quelle est la procédure de la rupture conventionnelle ?',
                    'Quelle est la procédure du licenciement ?',
                  ],
                }),
              },
            },
          ],
        }) // décomposition
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'This is a mocked LLM response.' } }],
        }); // réponse finale

      await pipeline.query('Compare la rupture conventionnelle et le licenciement');

      // 3 recherches : question originale + 2 sous-questions
      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(3);
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(3);
      // 2 appels LLM : décomposition + génération
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
    });

    it('deduplicates merged results keeping the best score', async () => {
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [
            { message: { content: JSON.stringify({ queries: ['sous-q 1', 'sous-q 2'] }) } },
          ],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'This is a mocked LLM response.' } }],
        });

      // Textes distincts pour que la dédup par contexte parent ne les fusionne pas
      const payloadA = { text: 'texte du chunk a', source: 'doc.pdf', documentId: 'd1' };
      const payloadB = { text: 'texte du chunk b', source: 'doc.pdf', documentId: 'd1' };
      (mockVectorStore.hybridSearch as Mock)
        .mockResolvedValueOnce([{ id: 'a', score: 0.5, payload: payloadA }])
        .mockResolvedValueOnce([{ id: 'a', score: 0.9, payload: payloadA }])
        .mockResolvedValueOnce([{ id: 'b', score: 0.7, payload: payloadB }]);

      const response = await pipeline.query('Différence entre CDD et CDI ?', { topN: 3 });

      // a gardé au meilleur score (0.9), trié avant b (0.7)
      expect(response.sources.map((s) => s.chunkId)).toEqual(['a', 'b']);
      expect(response.sources[0]?.score).toBeCloseTo(0.9);
    });

    it('falls back to standard search when decomposition returns bad JSON', async () => {
      mockOpenAICreate
        .mockResolvedValueOnce({ choices: [{ message: { content: 'pas du JSON' } }] })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'This is a mocked LLM response.' } }],
        });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const response = await pipeline.query('Compare A et B');

      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(1);
      expect(response.answer).toBe('This is a mocked LLM response.');
      consoleSpy.mockRestore();
    });

    it('falls back to standard search when fewer than 2 sub-queries', async () => {
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({ queries: ['une seule'] }) } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'This is a mocked LLM response.' } }],
        });

      await pipeline.query('Compare A et B');

      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(1);
    });

    it('does NOT trigger on a simple question', async () => {
      await pipeline.query('Quel est le montant du SMIC ?');

      // Pas de décomposition : 1 seul appel LLM (génération), 1 recherche
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(1);
    });

    it('respects multiQuery: false override on a composite question', async () => {
      await pipeline.query('Compare la rupture conventionnelle et le licenciement', {
        multiQuery: false,
        useHyde: false,
      });

      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.hybridSearch).toHaveBeenCalledTimes(1);
    });

    it('sets multiQueryMs in metrics when multi-query runs', async () => {
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({ queries: ['q1', 'q2'] }) } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'answer' } }],
        });

      const response = await pipeline.query('versus : A ou B ?');

      expect(response.metrics?.multiQueryMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('follow-up condensation', () => {
    const history = [
      { role: 'user' as const, content: 'Parle-moi du SMIC 2025' },
      { role: 'assistant' as const, content: 'Le SMIC horaire brut est de 11,88 €.' },
    ];

    it('should condense follow-up for retrieval but send the ORIGINAL question to the LLM', async () => {
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Quel est le montant du SMIC 2025 ?' } }],
        }) // condensation
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'This is a mocked LLM response.' } }],
        }); // réponse finale

      await pipeline.query("dis-m'en plus", { useHyde: false, conversationHistory: history });

      // Le retrieval utilise la question CONDENSÉE
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith('Quel est le montant du SMIC 2025 ?');
      // 2 appels LLM : condensation + génération
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
      // Le message user final envoyé au LLM reste la question ORIGINALE
      const finalCall = mockOpenAICreate.mock.calls[1]![0];
      const lastMessage = finalCall.messages[finalCall.messages.length - 1];
      expect(lastMessage).toEqual({ role: 'user', content: "dis-m'en plus" });
    });

    it('should skip condensation when history is empty', async () => {
      await pipeline.query("dis-m'en plus", { useHyde: false });

      expect(mockOpenAICreate).toHaveBeenCalledTimes(1); // uniquement la génération
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith("dis-m'en plus");
    });

    it('should skip condensation when condenseFollowUp is false', async () => {
      await pipeline.query("dis-m'en plus", {
        useHyde: false,
        conversationHistory: history,
        condenseFollowUp: false,
      });

      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith("dis-m'en plus");
    });

    it('should fall back to the original question when condensation fails', async () => {
      mockOpenAICreate.mockRejectedValueOnce(new Error('LLM down')).mockResolvedValueOnce({
        choices: [{ message: { content: 'This is a mocked LLM response.' } }],
      });

      const response = await pipeline.query("dis-m'en plus", {
        useHyde: false,
        conversationHistory: history,
      });

      // Fallback : la question brute est embedée, la query aboutit quand même
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith("dis-m'en plus");
      expect(response.answer).toBe('This is a mocked LLM response.');
    });

    it('should record condenseMs in metrics', async () => {
      mockOpenAICreate
        .mockResolvedValueOnce({ choices: [{ message: { content: 'standalone question' } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: 'answer' } }] });

      const response = await pipeline.query('more?', {
        useHyde: false,
        conversationHistory: history,
      });

      expect(response.metrics?.condenseMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // PER-DOCUMENT ENRICHMENT TESTS
  // ==========================================================================
  describe('per-document enrichment', () => {
    it('should enrich each document against its OWN content', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ '0': 'ctx', '1': 'ctx', '2': 'ctx' }) } }],
      });

      const docs: Document[] = [
        { id: 'doc1', content: 'UNIQUE_CONTENT_ONE', source: 'one.pdf' },
        { id: 'doc2', content: 'UNIQUE_CONTENT_TWO', source: 'two.pdf' },
      ];

      await pipeline.index(docs, { enableContextEnrichment: true });

      // Un batch d'enrichissement par document (3 chunks < ENRICHMENT_BATCH_SIZE)
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
      const prompts = mockOpenAICreate.mock.calls.map(
        (c) => (c[0] as { messages: Array<{ content: string }> }).messages[0]!.content
      );
      // Chaque prompt contient le contenu de SON document, pas celui de l'autre
      expect(prompts[0]).toContain('UNIQUE_CONTENT_ONE');
      expect(prompts[0]).not.toContain('UNIQUE_CONTENT_TWO');
      expect(prompts[1]).toContain('UNIQUE_CONTENT_TWO');
      expect(prompts[1]).not.toContain('UNIQUE_CONTENT_ONE');
    });
  });

  // ==========================================================================
  // TYPED EMBEDDING RETRY TESTS
  // ==========================================================================
  describe('embedding retry with typed errors', () => {
    const ApiErr = APIError as unknown as new (
      status?: number,
      message?: string
    ) => Error & { status?: number };

    const testDocuments: Document[] = [
      { id: 'doc1', content: 'Document 1 content', source: 'doc1.pdf' },
    ];

    it('should NOT retry embedBatch on a 4xx APIError (fail fast)', async () => {
      (mockEmbeddingService.embedBatch as Mock).mockRejectedValue(
        new ApiErr(401, 'Incorrect API key provided')
      );

      await expect(pipeline.index(testDocuments)).rejects.toThrow('Incorrect API key provided');
      expect(mockEmbeddingService.embedBatch).toHaveBeenCalledTimes(1);
    });

    it('should retry embedBatch on a 429 APIError', async () => {
      vi.useFakeTimers();
      try {
        (mockEmbeddingService.embedBatch as Mock)
          .mockRejectedValueOnce(new ApiErr(429, 'Rate limit exceeded'))
          .mockImplementation((texts: string[]) =>
            Promise.resolve(texts.map((_, i) => createMockEmbedding(i)))
          );

        const promise = pipeline.index(testDocuments);
        await vi.advanceTimersByTimeAsync(1500); // backoff 1s
        const result = await promise;

        expect(result.chunksCreated).toBe(3);
        expect(mockEmbeddingService.embedBatch).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
