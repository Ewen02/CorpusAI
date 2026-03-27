import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CachedEmbeddingService } from './cached-embedding.service';
import type { CacheService } from './types';
import type { EmbeddingService } from '../embeddings/types';

describe('CachedEmbeddingService', () => {
  let mockBaseService: EmbeddingService;
  let mockCache: CacheService;
  let cachedService: CachedEmbeddingService;

  const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
  const mockEmbedding2 = [0.5, 0.4, 0.3, 0.2, 0.1];

  beforeEach(() => {
    mockBaseService = {
      dimensions: 1536,
      model: 'text-embedding-3-small',
      embed: vi.fn().mockResolvedValue(mockEmbedding),
      embedBatch: vi
        .fn()
        .mockImplementation((texts: string[]) => Promise.resolve(texts.map(() => mockEmbedding))),
    };

    mockCache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      mget: vi.fn().mockResolvedValue([]),
      mset: vi.fn().mockResolvedValue(undefined),
    };

    cachedService = new CachedEmbeddingService({
      baseService: mockBaseService,
      cache: mockCache,
      ttlSeconds: 3600,
      keyPrefix: 'test:',
    });
  });

  describe('properties', () => {
    it('should delegate dimensions to base service', () => {
      expect(cachedService.dimensions).toBe(1536);
    });

    it('should delegate model to base service', () => {
      expect(cachedService.model).toBe('text-embedding-3-small');
    });
  });

  describe('embed()', () => {
    it('should call API on cache miss', async () => {
      mockCache.get = vi.fn().mockResolvedValue(null);

      const result = await cachedService.embed('test text');

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockBaseService.embed).toHaveBeenCalledWith('test text');
      expect(result).toEqual(mockEmbedding);
    });

    it('should return cached value on cache hit', async () => {
      const cachedValue = JSON.stringify(mockEmbedding2);
      mockCache.get = vi.fn().mockResolvedValue(cachedValue);

      const result = await cachedService.embed('test text');

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockBaseService.embed).not.toHaveBeenCalled();
      expect(result).toEqual(mockEmbedding2);
    });

    it('should store result in cache after API call', async () => {
      mockCache.get = vi.fn().mockResolvedValue(null);

      await cachedService.embed('test text');

      // Wait for fire-and-forget cache set
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('test:'),
        JSON.stringify(mockEmbedding),
        3600
      );
    });

    it('should use SHA-256 hash for cache key', async () => {
      await cachedService.embed('test text');

      expect(mockCache.get).toHaveBeenCalledWith(expect.stringMatching(/^test:\d+:[a-f0-9]{64}$/));
    });

    it('should use prefix in cache key', async () => {
      const customService = new CachedEmbeddingService({
        baseService: mockBaseService,
        cache: mockCache,
        keyPrefix: 'custom:prefix:',
      });

      await customService.embed('test');

      expect(mockCache.get).toHaveBeenCalledWith(expect.stringContaining('custom:prefix:'));
    });

    it('should handle cache read error gracefully', async () => {
      mockCache.get = vi.fn().mockRejectedValue(new Error('Redis error'));

      const result = await cachedService.embed('test text');

      expect(mockBaseService.embed).toHaveBeenCalled();
      expect(result).toEqual(mockEmbedding);
    });

    it('should handle cache write error gracefully', async () => {
      mockCache.get = vi.fn().mockResolvedValue(null);
      mockCache.set = vi.fn().mockRejectedValue(new Error('Redis error'));

      // Should not throw even if cache write fails
      const result = await cachedService.embed('test text');
      expect(result).toEqual(mockEmbedding);
    });

    it('should generate same hash for same input', async () => {
      const calls: string[] = [];
      mockCache.get = vi.fn().mockImplementation((key: string) => {
        calls.push(key);
        return Promise.resolve(null);
      });

      await cachedService.embed('identical text');
      await cachedService.embed('identical text');

      expect(calls[0]).toBe(calls[1]);
    });

    it('should generate different hash for different input', async () => {
      const calls: string[] = [];
      mockCache.get = vi.fn().mockImplementation((key: string) => {
        calls.push(key);
        return Promise.resolve(null);
      });

      await cachedService.embed('text one');
      await cachedService.embed('text two');

      expect(calls[0]).not.toBe(calls[1]);
    });
  });

  describe('embedBatch()', () => {
    it('should return empty array for empty input', async () => {
      const result = await cachedService.embedBatch([]);
      expect(result).toEqual([]);
      expect(mockCache.mget).not.toHaveBeenCalled();
    });

    it('should fetch all from API when cache is empty', async () => {
      mockCache.mget = vi.fn().mockResolvedValue([null, null, null]);

      const texts = ['text1', 'text2', 'text3'];
      const result = await cachedService.embedBatch(texts);

      expect(mockBaseService.embedBatch).toHaveBeenCalledWith(texts, undefined);
      expect(result.length).toBe(3);
    });

    it('should use cached values and only fetch missing', async () => {
      const cachedValue = JSON.stringify(mockEmbedding2);
      mockCache.mget = vi.fn().mockResolvedValue([cachedValue, null, cachedValue]);
      mockBaseService.embedBatch = vi.fn().mockResolvedValue([mockEmbedding]);

      const texts = ['text1', 'text2', 'text3'];
      const result = await cachedService.embedBatch(texts);

      // Should only fetch text2 (index 1)
      expect(mockBaseService.embedBatch).toHaveBeenCalledWith(['text2'], undefined);
      expect(result[0]).toEqual(mockEmbedding2); // From cache
      expect(result[1]).toEqual(mockEmbedding); // From API
      expect(result[2]).toEqual(mockEmbedding2); // From cache
    });

    it('should not call API when all cached', async () => {
      const cachedValue = JSON.stringify(mockEmbedding);
      mockCache.mget = vi.fn().mockResolvedValue([cachedValue, cachedValue]);

      const texts = ['text1', 'text2'];
      const result = await cachedService.embedBatch(texts);

      expect(mockBaseService.embedBatch).not.toHaveBeenCalled();
      expect(result.length).toBe(2);
    });

    it('should store new embeddings in cache', async () => {
      mockCache.mget = vi.fn().mockResolvedValue([null, null]);
      mockBaseService.embedBatch = vi.fn().mockResolvedValue([mockEmbedding, mockEmbedding2]);

      const texts = ['text1', 'text2'];
      await cachedService.embedBatch(texts);

      // Wait for fire-and-forget cache mset
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCache.mset).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ value: JSON.stringify(mockEmbedding) }),
          expect.objectContaining({ value: JSON.stringify(mockEmbedding2) }),
        ]),
        3600
      );
    });

    it('should handle cache mget error gracefully', async () => {
      mockCache.mget = vi.fn().mockRejectedValue(new Error('Redis error'));

      const texts = ['text1', 'text2'];
      const result = await cachedService.embedBatch(texts);

      expect(mockBaseService.embedBatch).toHaveBeenCalled();
      expect(result.length).toBe(2);
    });

    it('should handle invalid JSON in cache', async () => {
      mockCache.mget = vi.fn().mockResolvedValue(['invalid json', null]);
      mockBaseService.embedBatch = vi.fn().mockResolvedValue([mockEmbedding, mockEmbedding2]);

      const texts = ['text1', 'text2'];
      const result = await cachedService.embedBatch(texts);

      // Both should be fetched since first has invalid JSON
      expect(mockBaseService.embedBatch).toHaveBeenCalledWith(texts, undefined);
      expect(result.length).toBe(2);
    });

    it('should pass batchSize to base service', async () => {
      mockCache.mget = vi.fn().mockResolvedValue([null, null]);

      await cachedService.embedBatch(['text1', 'text2'], 50);

      expect(mockBaseService.embedBatch).toHaveBeenCalledWith(['text1', 'text2'], 50);
    });

    it('should throw if API fails to return embedding', async () => {
      mockCache.mget = vi.fn().mockResolvedValue([null]);
      mockBaseService.embedBatch = vi.fn().mockResolvedValue([undefined]);

      await expect(cachedService.embedBatch(['text1'])).rejects.toThrow(
        'Failed to get embedding for text at index 0'
      );
    });

    it('should preserve original order of results', async () => {
      const emb1 = [1, 2, 3];
      const emb2 = [4, 5, 6];
      const emb3 = [7, 8, 9];

      mockCache.mget = vi
        .fn()
        .mockResolvedValue([JSON.stringify(emb1), null, JSON.stringify(emb3)]);
      mockBaseService.embedBatch = vi.fn().mockResolvedValue([emb2]);

      const result = await cachedService.embedBatch(['t1', 't2', 't3']);

      expect(result[0]).toEqual(emb1);
      expect(result[1]).toEqual(emb2);
      expect(result[2]).toEqual(emb3);
    });
  });

  describe('getMetrics()', () => {
    it('should start with zero metrics', () => {
      const metrics = cachedService.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.hitRate).toBe(0);
    });

    it('should track cache hits', async () => {
      mockCache.get = vi.fn().mockResolvedValue(JSON.stringify(mockEmbedding));

      await cachedService.embed('test');
      await cachedService.embed('test');

      const metrics = cachedService.getMetrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(0);
      expect(metrics.hitRate).toBe(1);
    });

    it('should track cache misses', async () => {
      mockCache.get = vi.fn().mockResolvedValue(null);

      await cachedService.embed('test1');
      await cachedService.embed('test2');

      const metrics = cachedService.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(2);
      expect(metrics.hitRate).toBe(0);
    });

    it('should calculate hit rate correctly', async () => {
      // 2 hits, 2 misses = 50% hit rate
      mockCache.get = vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify(mockEmbedding)) // hit
        .mockResolvedValueOnce(null) // miss
        .mockResolvedValueOnce(JSON.stringify(mockEmbedding)) // hit
        .mockResolvedValueOnce(null); // miss

      await cachedService.embed('t1');
      await cachedService.embed('t2');
      await cachedService.embed('t3');
      await cachedService.embed('t4');

      const metrics = cachedService.getMetrics();
      expect(metrics.hitRate).toBe(0.5);
    });

    it('should track batch metrics correctly', async () => {
      mockCache.mget = vi
        .fn()
        .mockResolvedValue([JSON.stringify(mockEmbedding), null, JSON.stringify(mockEmbedding)]);

      await cachedService.embedBatch(['t1', 't2', 't3']);

      const metrics = cachedService.getMetrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
    });
  });

  describe('resetMetrics()', () => {
    it('should reset all metrics to zero', async () => {
      mockCache.get = vi.fn().mockResolvedValue(null);
      await cachedService.embed('test');

      cachedService.resetMetrics();

      const metrics = cachedService.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
    });
  });

  describe('onCacheError callback', () => {
    it('should call onCacheError on get failure', async () => {
      const onError = vi.fn();
      const serviceWithCallback = new CachedEmbeddingService({
        baseService: mockBaseService,
        cache: mockCache,
        onCacheError: onError,
      });

      const error = new Error('Redis connection failed');
      mockCache.get = vi.fn().mockRejectedValue(error);

      await serviceWithCallback.embed('test');

      expect(onError).toHaveBeenCalledWith(error, 'get');
    });

    it('should call onCacheError on set failure', async () => {
      const onError = vi.fn();
      const serviceWithCallback = new CachedEmbeddingService({
        baseService: mockBaseService,
        cache: mockCache,
        onCacheError: onError,
      });

      mockCache.get = vi.fn().mockResolvedValue(null);
      mockCache.set = vi.fn().mockRejectedValue(new Error('Write failed'));

      await serviceWithCallback.embed('test');
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onError).toHaveBeenCalledWith(expect.any(Error), 'set');
    });

    it('should call onCacheError on mget failure', async () => {
      const onError = vi.fn();
      const serviceWithCallback = new CachedEmbeddingService({
        baseService: mockBaseService,
        cache: mockCache,
        onCacheError: onError,
      });

      mockCache.mget = vi.fn().mockRejectedValue(new Error('Batch read failed'));

      await serviceWithCallback.embedBatch(['t1', 't2']);

      expect(onError).toHaveBeenCalledWith(expect.any(Error), 'mget');
    });

    it('should call onCacheError on mset failure', async () => {
      const onError = vi.fn();
      const serviceWithCallback = new CachedEmbeddingService({
        baseService: mockBaseService,
        cache: mockCache,
        onCacheError: onError,
      });

      mockCache.mget = vi.fn().mockResolvedValue([null]);
      mockCache.mset = vi.fn().mockRejectedValue(new Error('Batch write failed'));

      await serviceWithCallback.embedBatch(['test']);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onError).toHaveBeenCalledWith(expect.any(Error), 'mset');
    });
  });

  describe('default values', () => {
    it('should use default TTL when not specified', async () => {
      const serviceWithDefaults = new CachedEmbeddingService({
        baseService: mockBaseService,
        cache: mockCache,
      });

      await serviceWithDefaults.embed('test');

      // Wait for fire-and-forget
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        604800 // 7 days default
      );
    });

    it('should use default prefix when not specified', async () => {
      const serviceWithDefaults = new CachedEmbeddingService({
        baseService: mockBaseService,
        cache: mockCache,
      });

      await serviceWithDefaults.embed('test');

      expect(mockCache.get).toHaveBeenCalledWith(expect.stringContaining('emb:'));
    });
  });
});
