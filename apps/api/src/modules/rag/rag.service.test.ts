import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagService } from './rag.service';

describe('RagService', () => {
  let service: RagService;

  const mockPipeline = {
    index: vi.fn(),
    query: vi.fn(),
  };

  const mockVectorStore = {
    deleteByDocument: vi.fn(),
    deleteByAI: vi.fn(),
  };

  const mockFactory = {
    createForAI: vi.fn().mockReturnValue(mockPipeline),
    getVectorStore: vi.fn().mockReturnValue(mockVectorStore),
    getCacheMetrics: vi.fn(),
    getEmbeddingService: vi.fn(),
    getSparseGenerator: vi.fn(),
    isCacheEnabled: false,
  };

  beforeEach(() => {
    service = new RagService(mockFactory as any);
    vi.clearAllMocks();
    // Restore defaults after clearAllMocks
    mockFactory.createForAI.mockReturnValue(mockPipeline);
    mockFactory.getVectorStore.mockReturnValue(mockVectorStore);
  });

  describe('indexDocument', () => {
    it('should create pipeline and call index', async () => {
      const indexResult = { chunksCreated: 10, documentsProcessed: 1 };
      mockPipeline.index.mockResolvedValue(indexResult);

      const document = {
        id: 'doc-1',
        content: 'Hello world',
        source: 'test.pdf',
        metadata: { pages: 5 },
      };

      const result = await service.indexDocument('ai-1', document);

      expect(result).toBe(indexResult);
      expect(mockFactory.createForAI).toHaveBeenCalledWith('ai-1');
      expect(mockPipeline.index).toHaveBeenCalledWith(
        [
          {
            id: 'doc-1',
            content: 'Hello world',
            source: 'test.pdf',
            metadata: { pages: 5 },
          },
        ],
        { onProgress: undefined }
      );
    });
  });

  describe('query', () => {
    it('should create pipeline and return RAGResponse', async () => {
      const ragResponse = {
        answer: 'The answer is 42',
        sources: [{ documentId: 'doc-1', text: 'source text', score: 0.9 }],
      };
      mockPipeline.query.mockResolvedValue(ragResponse);

      const result = await service.query('ai-1', 'What is the answer?', { temperature: 0.5 });

      expect(result).toBe(ragResponse);
      expect(mockFactory.createForAI).toHaveBeenCalledWith('ai-1', { temperature: 0.5 });
      expect(mockPipeline.query).toHaveBeenCalledWith('What is the answer?', {
        topK: undefined,
        scoreThreshold: undefined,
        includeSources: true,
        conversationHistory: undefined,
      });
    });
  });

  describe('deleteDocumentVectors', () => {
    it('should call vectorStore.deleteByDocument', async () => {
      mockVectorStore.deleteByDocument.mockResolvedValue(undefined);

      await service.deleteDocumentVectors('ai-1', 'doc-1');

      expect(mockFactory.getVectorStore).toHaveBeenCalled();
      expect(mockVectorStore.deleteByDocument).toHaveBeenCalledWith('ai-1', 'doc-1');
    });
  });

  describe('deleteAIVectors', () => {
    it('should call vectorStore.deleteByAI', async () => {
      mockVectorStore.deleteByAI.mockResolvedValue(undefined);

      await service.deleteAIVectors('ai-1');

      expect(mockFactory.getVectorStore).toHaveBeenCalled();
      expect(mockVectorStore.deleteByAI).toHaveBeenCalledWith('ai-1');
    });

    it('should not throw if Qdrant fails', async () => {
      mockVectorStore.deleteByAI.mockRejectedValue(new Error('Qdrant connection refused'));

      // Should not throw — the service catches and logs the error
      await expect(service.deleteAIVectors('ai-1')).resolves.toBeUndefined();
    });
  });

  describe('getCacheMetrics', () => {
    it('should return metrics when cache is enabled', () => {
      const metrics = { hits: 100, misses: 20, hitRate: 0.83 };
      mockFactory.getCacheMetrics.mockReturnValue(metrics);

      const result = service.getCacheMetrics();

      expect(result).toBe(metrics);
      expect(mockFactory.getCacheMetrics).toHaveBeenCalled();
    });

    it('should return null when cache is disabled', () => {
      mockFactory.getCacheMetrics.mockReturnValue(null);

      const result = service.getCacheMetrics();

      expect(result).toBeNull();
    });
  });

  describe('isCacheEnabled', () => {
    it('should delegate to factory', () => {
      mockFactory.isCacheEnabled = true;

      expect(service.isCacheEnabled()).toBe(true);

      mockFactory.isCacheEnabled = false;

      expect(service.isCacheEnabled()).toBe(false);
    });
  });
});
