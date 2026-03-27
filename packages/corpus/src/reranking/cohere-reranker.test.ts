import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CohereReranker } from './cohere-reranker';
import type { SearchResult } from '../vector-store/types';

const createMockResults = (count: number): SearchResult[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `chunk_${i}`,
    score: 0.9 - i * 0.1,
    payload: {
      text: `Result ${i} text content`,
      source: `document_${i}.pdf`,
      documentId: `doc_${i}`,
    },
  }));

describe('CohereReranker', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { index: 1, relevance_score: 0.97 },
          { index: 0, relevance_score: 0.82 },
          { index: 2, relevance_score: 0.43 },
        ],
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should have isAsync discriminant set to true', () => {
    const reranker = new CohereReranker({ apiKey: 'test-key' });
    expect(reranker.isAsync).toBe(true);
  });

  it('should call fetch with correct URL, headers and body', async () => {
    const reranker = new CohereReranker({ apiKey: 'my-cohere-key', topN: 2 });
    const results = createMockResults(3);

    await reranker.rerank(results, 'What is TypeScript?');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.cohere.com/v1/rerank',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer my-cohere-key',
          'Content-Type': 'application/json',
        },
      })
    );

    const bodyStr: string = mockFetch.mock.calls[0]![1].body;
    const body = JSON.parse(bodyStr) as {
      model: string;
      query: string;
      documents: string[];
      top_n: number;
      return_documents: boolean;
    };
    expect(body.model).toBe('rerank-multilingual-v3.0');
    expect(body.query).toBe('What is TypeScript?');
    expect(body.documents).toEqual([
      'Result 0 text content',
      'Result 1 text content',
      'Result 2 text content',
    ]);
    expect(body.top_n).toBe(2);
    expect(body.return_documents).toBe(false);
  });

  it('should map Cohere results correctly (index → original result, finalScore = relevance_score)', async () => {
    const reranker = new CohereReranker({ apiKey: 'test-key', topN: 3 });
    const results = createMockResults(3);

    const reranked = await reranker.rerank(results, 'test query');

    // Should be 3 results (top_n capped by results.length)
    expect(reranked).toHaveLength(3);

    // First result should be original index=1 with relevance_score=0.97
    expect(reranked[0]!.id).toBe('chunk_1');
    expect(reranked[0]!.finalScore).toBeCloseTo(0.97, 2);
    expect(reranked[0]!.semanticScore).toBeCloseTo(0.8, 1); // original score of chunk_1

    // Second result should be original index=0 with relevance_score=0.82
    expect(reranked[1]!.id).toBe('chunk_0');
    expect(reranked[1]!.finalScore).toBeCloseTo(0.82, 2);
  });

  it('should use custom model when provided', async () => {
    const reranker = new CohereReranker({ apiKey: 'test-key', model: 'rerank-english-v3.0' });
    await reranker.rerank(createMockResults(3), 'test');

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body) as { model: string };
    expect(body.model).toBe('rerank-english-v3.0');
  });

  it('should return results with Cohere relevance scores', async () => {
    const reranker = new CohereReranker({ apiKey: 'test-key' });

    const reranked = await reranker.rerank(createMockResults(3), 'test query');

    // Cohere mock returns index 1 first (0.97), then 0 (0.82), then 2 (0.43)
    expect(reranked[0]!.finalScore).toBeCloseTo(0.97, 2);
    expect(reranked[1]!.finalScore).toBeCloseTo(0.82, 2);
    expect(reranked[2]!.finalScore).toBeCloseTo(0.43, 2);
  });

  it('should fallback to semantic order on network error (no throw)', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));

    const reranker = new CohereReranker({ apiKey: 'test-key' });
    const results = createMockResults(3);

    // Must not throw — silent fallback
    const fallback = await reranker.rerank(results, 'test');

    // Fallback preserves original order with original scores
    expect(fallback).toHaveLength(3);
    expect(fallback[0]!.id).toBe('chunk_0');
    expect(fallback[0]!.score).toBeCloseTo(0.9, 1);
    expect(fallback[0]!.finalScore).toBeCloseTo(0.9, 1);
    expect(fallback[0]!.bm25Score).toBe(0);
  });

  it('should fallback to semantic order on HTTP error (status 401)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({}),
    });

    const reranker = new CohereReranker({ apiKey: 'bad-key' });
    const results = createMockResults(3);

    const fallback = await reranker.rerank(results, 'test');

    // Silent fallback — no throw, preserves original order
    expect(fallback).toHaveLength(3);
  });

  it('should return empty array for empty results', async () => {
    const reranker = new CohereReranker({ apiKey: 'test-key' });
    const result = await reranker.rerank([], 'test');

    expect(result).toEqual([]);
    // fetch should NOT be called for empty input
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should cap top_n to results.length when topN > results.length', async () => {
    const reranker = new CohereReranker({ apiKey: 'test-key', topN: 10 });

    // Override mock to return only 2 results
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { index: 1, relevance_score: 0.9 },
          { index: 0, relevance_score: 0.7 },
        ],
      }),
    });

    await reranker.rerank(createMockResults(2), 'test');

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body) as { top_n: number };
    // top_n should be min(10, 2) = 2
    expect(body.top_n).toBe(2);
  });
});
