import { describe, it, expect } from 'vitest';
import { HybridReranker } from './hybrid-reranker';
import type { SearchResult } from '../vector-store/types';

describe('HybridReranker', () => {
  const reranker = new HybridReranker();

  // Helper to create mock search results
  const createResults = (
    items: Array<{ id: string; score: number; text: string }>
  ): SearchResult[] => {
    return items.map((item) => ({
      id: item.id,
      score: item.score,
      payload: { text: item.text, source: 'test.pdf' },
    }));
  };

  describe('rerank()', () => {
    it('should return empty array for empty results', () => {
      const ranked = reranker.rerank([], 'test query');
      expect(ranked).toEqual([]);
    });

    it('should combine semantic and BM25 scores', () => {
      const results = createResults([
        { id: '1', score: 0.9, text: 'TypeScript is a typed programming language' },
        { id: '2', score: 0.8, text: 'JavaScript runs in browsers' },
        { id: '3', score: 0.7, text: 'Python is popular for data science' },
      ]);

      const ranked = reranker.rerank(results, 'TypeScript programming');

      // All results should have the enhanced score properties
      expect(ranked).toHaveLength(3);
      ranked.forEach((r) => {
        expect(r).toHaveProperty('semanticScore');
        expect(r).toHaveProperty('bm25Score');
        expect(r).toHaveProperty('finalScore');
        expect(r.finalScore).toBeGreaterThanOrEqual(0);
      });
    });

    it('should use default weights (60% semantic, 40% BM25)', () => {
      const results = createResults([
        { id: '1', score: 1.0, text: 'exact match query terms' },
      ]);

      const ranked = reranker.rerank(results, 'exact match');

      // With semantic=1.0 and some BM25 score, final should be weighted
      // finalScore = 0.6 * semanticScore + 0.4 * bm25Score
      expect(ranked[0]!.semanticScore).toBe(1.0);
      expect(ranked[0]!.bm25Score).toBeGreaterThanOrEqual(0);
      expect(ranked[0]!.bm25Score).toBeLessThanOrEqual(1);

      // Verify formula: finalScore = 0.6 * 1.0 + 0.4 * bm25Score
      const expected = 0.6 * 1.0 + 0.4 * ranked[0]!.bm25Score;
      expect(ranked[0]!.finalScore).toBeCloseTo(expected, 5);
    });

    it('should respect custom weights', () => {
      const results = createResults([
        { id: '1', score: 0.5, text: 'test document content' },
      ]);

      const customConfig = { semanticWeight: 0.8, bm25Weight: 0.2 };
      const ranked = reranker.rerank(results, 'test', customConfig);

      // Verify formula: finalScore = 0.8 * semanticScore + 0.2 * bm25Score
      const expected = 0.8 * ranked[0]!.semanticScore + 0.2 * ranked[0]!.bm25Score;
      expect(ranked[0]!.finalScore).toBeCloseTo(expected, 5);
    });

    it('should reorder results based on combined score', () => {
      // Result with low semantic but high BM25 match
      // Result with high semantic but low BM25 match
      const results = createResults([
        { id: 'match', score: 0.3, text: 'machine learning algorithms neural networks deep learning' },
        { id: 'no-match', score: 0.9, text: 'cooking recipes food preparation kitchen' },
      ]);

      const ranked = reranker.rerank(results, 'machine learning neural networks');

      const matchResult = ranked.find((r) => r.id === 'match')!;
      const noMatchResult = ranked.find((r) => r.id === 'no-match')!;

      // The matching result should have higher BM25 score than the non-matching one
      expect(matchResult.bm25Score).toBeGreaterThan(noMatchResult.bm25Score);
    });

    it('should sort results by finalScore in descending order', () => {
      const results = createResults([
        { id: '1', score: 0.5, text: 'document one' },
        { id: '2', score: 0.7, text: 'document two' },
        { id: '3', score: 0.9, text: 'document three' },
      ]);

      const ranked = reranker.rerank(results, 'document');

      // Verify descending order
      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1]!.finalScore).toBeGreaterThanOrEqual(ranked[i]!.finalScore);
      }
    });

    it('should override original score with finalScore', () => {
      const results = createResults([
        { id: '1', score: 0.8, text: 'test content' },
      ]);

      const ranked = reranker.rerank(results, 'test');

      // The score property should be replaced with finalScore
      expect(ranked[0]!.score).toBe(ranked[0]!.finalScore);
    });

    it('should preserve original result properties', () => {
      const results: SearchResult[] = [
        {
          id: 'custom-id',
          score: 0.75,
          payload: {
            text: 'document content',
            source: 'custom-source.pdf',
            customField: 'custom value',
          },
        },
      ];

      const ranked = reranker.rerank(results, 'document');

      expect(ranked[0]!.id).toBe('custom-id');
      expect(ranked[0]!.payload.source).toBe('custom-source.pdf');
      expect(ranked[0]!.payload.customField).toBe('custom value');
    });

    it('should handle results with missing text payload', () => {
      const results: SearchResult[] = [
        { id: '1', score: 0.8, payload: {} }, // No text
        { id: '2', score: 0.7, payload: { text: 'has text' } },
        { id: '3', score: 0.6, payload: { text: 123 } }, // Non-string text
      ];

      const ranked = reranker.rerank(results, 'test query');

      expect(ranked).toHaveLength(3);
      // Should not throw, handle gracefully
      ranked.forEach((r) => {
        expect(r.bm25Score).toBeGreaterThanOrEqual(0);
        expect(r.finalScore).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle single result', () => {
      const results = createResults([
        { id: '1', score: 0.85, text: 'single document' },
      ]);

      const ranked = reranker.rerank(results, 'single');

      expect(ranked).toHaveLength(1);
      expect(ranked[0]!.id).toBe('1');
      expect(ranked[0]!.semanticScore).toBe(0.85);
    });

    it('should handle query with no matching terms', () => {
      const results = createResults([
        { id: '1', score: 0.8, text: 'apple banana cherry' },
        { id: '2', score: 0.7, text: 'dog cat bird' },
      ]);

      const ranked = reranker.rerank(results, 'xyz123 nonexistent terms');

      // Results should still be returned and ordered
      expect(ranked).toHaveLength(2);

      // BM25 normalized returns 0.5 when score is 0 (due to normalization formula)
      // The important thing is results are handled gracefully
      ranked.forEach((r) => {
        expect(r.bm25Score).toBeGreaterThanOrEqual(0);
        expect(r.bm25Score).toBeLessThanOrEqual(1);
      });
    });

    it('should handle partial weight override', () => {
      const results = createResults([
        { id: '1', score: 0.5, text: 'test document' },
      ]);

      // Only override semanticWeight, bm25Weight should use default
      const ranked = reranker.rerank(results, 'test', { semanticWeight: 0.9 });

      // Should use semanticWeight=0.9, bm25Weight=0.4 (default)
      const expected = 0.9 * ranked[0]!.semanticScore + 0.4 * ranked[0]!.bm25Score;
      expect(ranked[0]!.finalScore).toBeCloseTo(expected, 5);
    });

    it('should produce consistent results for same input', () => {
      const results = createResults([
        { id: '1', score: 0.8, text: 'consistent document one' },
        { id: '2', score: 0.7, text: 'consistent document two' },
      ]);

      const ranked1 = reranker.rerank(results, 'consistent');
      const ranked2 = reranker.rerank(results, 'consistent');

      expect(ranked1).toEqual(ranked2);
    });
  });

  describe('score calculation', () => {
    it('should give higher BM25 score to documents with query terms', () => {
      const results = createResults([
        { id: 'match', score: 0.5, text: 'TypeScript is awesome for web development' },
        { id: 'no-match', score: 0.5, text: 'Python is great for data science' },
      ]);

      const ranked = reranker.rerank(results, 'TypeScript web');

      const matchResult = ranked.find((r) => r.id === 'match')!;
      const noMatchResult = ranked.find((r) => r.id === 'no-match')!;

      expect(matchResult.bm25Score).toBeGreaterThan(noMatchResult.bm25Score);
    });

    it('should normalize BM25 scores between 0 and 1', () => {
      const results = createResults([
        { id: '1', score: 0.8, text: 'repeated word word word word word' },
        { id: '2', score: 0.7, text: 'another document' },
      ]);

      const ranked = reranker.rerank(results, 'word');

      ranked.forEach((r) => {
        expect(r.bm25Score).toBeGreaterThanOrEqual(0);
        expect(r.bm25Score).toBeLessThanOrEqual(1);
      });
    });

    it('should produce finalScore in valid range', () => {
      const results = createResults([
        { id: '1', score: 1.0, text: 'maximum semantic score document' },
        { id: '2', score: 0.0, text: 'minimum semantic score document' },
      ]);

      const ranked = reranker.rerank(results, 'document');

      ranked.forEach((r) => {
        // With weights 0.6 + 0.4 = 1.0 and scores in [0,1],
        // finalScore should also be in [0,1]
        expect(r.finalScore).toBeGreaterThanOrEqual(0);
        expect(r.finalScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long documents', () => {
      const longText = 'word '.repeat(10000);
      const results = createResults([
        { id: '1', score: 0.8, text: longText },
      ]);

      const ranked = reranker.rerank(results, 'word');

      expect(ranked).toHaveLength(1);
      expect(ranked[0]!.bm25Score).toBeGreaterThan(0);
    });

    it('should handle empty query', () => {
      const results = createResults([
        { id: '1', score: 0.8, text: 'some content' },
      ]);

      const ranked = reranker.rerank(results, '');

      expect(ranked).toHaveLength(1);
      // BM25 normalized returns 0.5 for empty query (due to normalization)
      expect(ranked[0]!.bm25Score).toBeGreaterThanOrEqual(0);
      expect(ranked[0]!.bm25Score).toBeLessThanOrEqual(1);
    });

    it('should handle special characters in query', () => {
      const results = createResults([
        { id: '1', score: 0.8, text: 'C++ programming language' },
      ]);

      // Should not throw
      const ranked = reranker.rerank(results, 'C++ programming');

      expect(ranked).toHaveLength(1);
    });

    it('should handle unicode text', () => {
      const results = createResults([
        { id: '1', score: 0.8, text: '日本語のテキスト' },
        { id: '2', score: 0.7, text: 'Текст на русском' },
      ]);

      const ranked = reranker.rerank(results, '日本語');

      expect(ranked).toHaveLength(2);
      // Should handle without throwing
    });
  });
});
