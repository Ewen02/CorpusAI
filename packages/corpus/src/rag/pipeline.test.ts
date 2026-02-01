import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { RAGPipelineImpl } from './pipeline';
import type { EmbeddingService } from '../embeddings/types';
import type { VectorStoreService, SearchResult } from '../vector-store/types';
import type { ChunkingService, Chunk, ChunkMetadata } from '../chunking/types';
import type { Reranker, ScoredResult } from '../reranking/types';
import type { Document, LLMConfig, ProgressCallback, ProcessingStage } from './types';

// Shared mock for OpenAI create function
const mockOpenAICreate = vi.fn();

// Mock OpenAI module
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate,
        },
      },
    })),
  };
});

// Helper to create mock embedding (1536 dimensions)
const createMockEmbedding = (seed: number = 0): number[] => {
  return Array.from({ length: 1536 }, (_, i) => Math.sin(seed + i) * 0.5);
};

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
  let mockVectorStore: VectorStoreService;
  let mockChunker: ChunkingService;
  let mockReranker: Reranker;
  let llmConfig: LLMConfig;
  let pipeline: RAGPipelineImpl;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock for OpenAI create
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: 'This is a mocked LLM response.' } }],
    });

    // Setup mock embedding service
    mockEmbeddingService = {
      dimensions: 1536,
      model: 'text-embedding-3-small',
      embed: vi.fn().mockResolvedValue(createMockEmbedding(1)),
      embedBatch: vi.fn().mockImplementation((texts: string[]) =>
        Promise.resolve(texts.map((_, i) => createMockEmbedding(i)))
      ),
    };

    // Setup mock vector store
    mockVectorStore = {
      collectionName: 'test_collection',
      ensureCollection: vi.fn().mockResolvedValue(undefined),
      upsert: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue(createMockSearchResults(3)),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteByIds: vi.fn().mockResolvedValue(undefined),
      deleteCollection: vi.fn().mockResolvedValue(undefined),
    };

    // Setup mock chunker
    mockChunker = {
      strategy: 'mock',
      chunk: vi.fn().mockImplementation((text: string, metadata: ChunkMetadata) => {
        return createMockChunks(3, metadata.documentId, metadata.source);
      }),
    };

    // Setup mock reranker
    mockReranker = {
      rerank: vi.fn().mockImplementation((results: SearchResult[]) => {
        return results.map((r) => ({
          ...r,
          semanticScore: r.score,
          bm25Score: r.score * 0.8,
          finalScore: r.score * 0.9,
        })) as ScoredResult[];
      }),
    };

    // Setup LLM config
    llmConfig = {
      apiKey: 'test-api-key',
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 1000,
    };

    // Create pipeline
    pipeline = new RAGPipelineImpl(
      mockEmbeddingService,
      mockVectorStore,
      mockChunker,
      llmConfig,
      mockReranker
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
  });

  // ==========================================================================
  // QUERY TESTS
  // ==========================================================================
  describe('query()', () => {
    it('should execute full query pipeline: embed → search → rerank → LLM', async () => {
      const response = await pipeline.query('What is TypeScript?');

      // Verify embedding was called for the question
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith('What is TypeScript?');

      // Verify vector search
      expect(mockVectorStore.search).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          limit: 5,
          scoreThreshold: 0.6,
          withPayload: true,
        })
      );

      // Verify reranker was called
      expect(mockReranker.rerank).toHaveBeenCalled();

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

    it('should call LLM even when no results found (low relevance warning)', async () => {
      (mockVectorStore.search as Mock).mockResolvedValue([]);

      const response = await pipeline.query('Unknown question');

      // LLM is always called, even without results
      expect(mockOpenAICreate).toHaveBeenCalled();

      // System prompt should contain low relevance warning
      const callArgs = mockOpenAICreate.mock.calls[0]![0];
      expect(callArgs.messages[0].content).toContain('pertinence faible');

      expect(response.answer).toBe('This is a mocked LLM response.');
      expect(response.sources).toHaveLength(0);
      expect(response.context).toBe('');
    });

    it('should include metrics with timing breakdown', async () => {
      const response = await pipeline.query('Test question');

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
        mockEmbeddingService,
        mockVectorStore,
        mockChunker,
        llmConfig
        // No reranker
      );

      const response = await pipelineNoRerank.query('Test question');

      expect(mockReranker.rerank).not.toHaveBeenCalled();
      expect(response.answer).toBe('This is a mocked LLM response.');
      expect(response.sources).toHaveLength(3);
    });

    it('should respect query options', async () => {
      await pipeline.query('Test', {
        topK: 10,
        scoreThreshold: 0.7,
        includeSources: false,
      });

      expect(mockVectorStore.search).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          limit: 10,
          scoreThreshold: 0.7,
        })
      );
    });

    it('should exclude sources when includeSources is false', async () => {
      const response = await pipeline.query('Test', { includeSources: false });

      expect(response.sources).toHaveLength(0);
    });

    it('should use custom system prompt when provided', async () => {
      const customConfig: LLMConfig = {
        ...llmConfig,
        systemPrompt: 'You are a helpful assistant specialized in cooking.',
      };

      const customPipeline = new RAGPipelineImpl(
        mockEmbeddingService,
        mockVectorStore,
        mockChunker,
        customConfig,
        mockReranker
      );

      await customPipeline.query('How to make pasta?');

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
      const generator = pipeline.queryStream('Test question');

      let result: { value: string; done: boolean } | { value: unknown; done: boolean };
      while (!(result = await generator.next()).done) {
        tokens.push(result.value as string);
      }

      // Verify tokens were yielded
      expect(tokens).toEqual(['Hello', ' ', 'World']);

      // Verify final response
      const finalResponse = result.value;
      expect(finalResponse.answer).toBe('Hello World');
      expect(finalResponse.sources).toHaveLength(3);
    });

    it('should stream LLM response even when no results found', async () => {
      (mockVectorStore.search as Mock).mockResolvedValue([]);

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'No context response' } }] };
        },
      };
      mockOpenAICreate.mockResolvedValue(mockStream);

      const generator = pipeline.queryStream('Unknown question');

      const tokens: string[] = [];
      let result: { value: unknown; done: boolean };
      while (!(result = await generator.next()).done) {
        tokens.push(result.value as string);
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
      const generator = pipeline.queryStream('Test');

      let result: { value: unknown; done: boolean };
      while (!(result = await generator.next()).done) {
        tokens.push(result.value as string);
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

      expect(mockVectorStore.delete).toHaveBeenCalledTimes(3);

      // Verify filter format for each document
      expect(mockVectorStore.delete).toHaveBeenCalledWith({
        must: [{ key: 'documentId', match: { value: 'doc1' } }],
      });
      expect(mockVectorStore.delete).toHaveBeenCalledWith({
        must: [{ key: 'documentId', match: { value: 'doc2' } }],
      });
      expect(mockVectorStore.delete).toHaveBeenCalledWith({
        must: [{ key: 'documentId', match: { value: 'doc3' } }],
      });
    });

    it('should handle empty document list', async () => {
      await pipeline.deleteDocuments([]);

      expect(mockVectorStore.delete).not.toHaveBeenCalled();
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

      (mockVectorStore.search as Mock).mockResolvedValue(customResults);
      (mockReranker.rerank as Mock).mockImplementation((results: SearchResult[]) =>
        results.map((r) => ({
          ...r,
          semanticScore: r.score,
          bm25Score: r.score * 0.8,
          finalScore: r.score,
        }))
      );

      const response = await pipeline.query('Test');

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

      const response = await pipeline.query('Test');

      expect(response.answer).toBe('');
    });

    it('should handle LLM returning null content', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const response = await pipeline.query('Test');

      expect(response.answer).toBe('');
    });

    it('should handle single document indexing', async () => {
      const singleDoc: Document[] = [{ id: 'single', content: 'Only one', source: 'single.pdf' }];

      const result = await pipeline.index(singleDoc);

      expect(result.documentsIndexed).toBe(1);
    });

    it('should handle search result with missing payload fields', async () => {
      const incompleteResults: SearchResult[] = [
        { id: 'chunk1', score: 0.9, payload: {} }, // Missing text and source
      ];

      (mockVectorStore.search as Mock).mockResolvedValue(incompleteResults);
      (mockReranker.rerank as Mock).mockImplementation((results: SearchResult[]) =>
        results.map((r) => ({
          ...r,
          semanticScore: r.score,
          bm25Score: 0.5,
          finalScore: r.score,
        }))
      );

      const response = await pipeline.query('Test');

      // Should handle gracefully
      expect(response.sources[0]?.documentSource).toBe('unknown');
      expect(response.sources[0]?.text).toBe('');
    });
  });
});
