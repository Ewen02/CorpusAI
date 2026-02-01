import { describe, it, expect } from 'vitest';
import { BM25 } from './bm25';

describe('BM25', () => {
  const sampleDocs = [
    'the cat sat on the mat',
    'the dog ran in the park',
    'a bird flew over the house',
    'the cat and the dog played together',
  ];

  describe('constructor', () => {
    it('should initialize with documents', () => {
      const bm25 = new BM25(sampleDocs);
      expect(bm25).toBeDefined();
    });

    it('should handle empty document list', () => {
      const bm25 = new BM25([]);
      expect(bm25.score('test', 0)).toBe(0);
    });

    it('should accept custom k1 and b parameters', () => {
      const bm25 = new BM25(sampleDocs, 2.0, 0.5);
      expect(bm25).toBeDefined();
    });
  });

  describe('score()', () => {
    it('should score documents containing query terms higher', () => {
      const bm25 = new BM25(sampleDocs);
      const catScore = bm25.score('cat mat', 0); // "the cat sat on the mat"
      const dogScore = bm25.score('cat mat', 1); // "the dog ran in the park"
      expect(catScore).toBeGreaterThan(dogScore);
    });

    it('should return 0 for documents without query terms', () => {
      const bm25 = new BM25(sampleDocs);
      const score = bm25.score('elephant zebra', 0);
      expect(score).toBe(0);
    });

    it('should return 0 for invalid document index', () => {
      const bm25 = new BM25(sampleDocs);
      expect(bm25.score('cat', -1)).toBe(0);
      expect(bm25.score('cat', 100)).toBe(0);
    });

    it('should handle multi-word queries', () => {
      const bm25 = new BM25(sampleDocs);
      const catDogScore = bm25.score('cat dog', 3); // "the cat and the dog played together"
      const catOnlyScore = bm25.score('cat', 3);
      expect(catDogScore).toBeGreaterThan(catOnlyScore);
    });

    it('should handle repeated terms in query', () => {
      const bm25 = new BM25(sampleDocs);
      const score = bm25.score('cat cat cat', 0);
      expect(score).toBeGreaterThan(0);
    });

    it('should handle documents with repeated terms', () => {
      const docsWithRepeats = ['cat cat cat cat', 'cat', 'dog'];
      const bm25 = new BM25(docsWithRepeats);
      const manyScore = bm25.score('cat', 0);
      const oneScore = bm25.score('cat', 1);
      // Both should have positive scores, but saturation (k1) limits the advantage of repetition
      expect(manyScore).toBeGreaterThan(oneScore);
    });
  });

  describe('scoreNormalized()', () => {
    it('should return values between 0 and 1', () => {
      const bm25 = new BM25(sampleDocs);
      for (let i = 0; i < sampleDocs.length; i++) {
        const score = bm25.scoreNormalized('cat dog bird', i);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });

    it('should return 0.5 for score of 0 (sigmoid property)', () => {
      const bm25 = new BM25(sampleDocs);
      const score = bm25.scoreNormalized('elephant', 0);
      // When raw score is 0, sigmoid(0/5) = 0.5
      expect(score).toBe(0.5);
    });

    it('should preserve relative ordering from raw scores', () => {
      const bm25 = new BM25(sampleDocs);
      const normScore0 = bm25.scoreNormalized('cat mat', 0);
      const normScore1 = bm25.scoreNormalized('cat mat', 1);
      const rawScore0 = bm25.score('cat mat', 0);
      const rawScore1 = bm25.score('cat mat', 1);

      // If raw0 > raw1, then norm0 > norm1
      if (rawScore0 > rawScore1) {
        expect(normScore0).toBeGreaterThan(normScore1);
      }
    });
  });

  describe('scoreAll()', () => {
    it('should return scores for all documents', () => {
      const bm25 = new BM25(sampleDocs);
      const scores = bm25.scoreAll('cat');
      expect(scores.length).toBe(sampleDocs.length);
    });

    it('should return normalized scores', () => {
      const bm25 = new BM25(sampleDocs);
      const scores = bm25.scoreAll('cat');
      for (const score of scores) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('tokenization', () => {
    it('should handle accented characters', () => {
      const docsWithAccents = ['résumé français', 'cafe au lait', 'naive approach'];
      const bm25 = new BM25(docsWithAccents);
      const score = bm25.score('résumé', 0);
      expect(score).toBeGreaterThan(0);
    });

    it('should handle punctuation', () => {
      const docsWithPunct = ['hello, world!', 'hello world', 'goodbye'];
      const bm25 = new BM25(docsWithPunct);
      // Both "hello, world!" and "hello world" should match "hello"
      const score0 = bm25.score('hello', 0);
      const score1 = bm25.score('hello', 1);
      expect(score0).toBeGreaterThan(0);
      expect(score1).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const bm25 = new BM25(['Hello World', 'HELLO world', 'hello WORLD']);
      const scores = bm25.scoreAll('hello world');
      // All should have the same score
      expect(scores[0]).toBeCloseTo(scores[1]!, 5);
      expect(scores[1]).toBeCloseTo(scores[2]!, 5);
    });

    it('should filter short tokens (length <= 1)', () => {
      const bm25 = new BM25(['a b c d e', 'ab cd ef']);
      // Query with single chars should not match
      const score = bm25.score('a b c', 0);
      expect(score).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty query', () => {
      const bm25 = new BM25(sampleDocs);
      const score = bm25.score('', 0);
      expect(score).toBe(0);
    });

    it('should handle whitespace-only query', () => {
      const bm25 = new BM25(sampleDocs);
      const score = bm25.score('   ', 0);
      expect(score).toBe(0);
    });

    it('should handle empty documents in corpus', () => {
      const docsWithEmpty = ['', 'some text', ''];
      const bm25 = new BM25(docsWithEmpty);
      expect(bm25.score('text', 0)).toBe(0);
      expect(bm25.score('text', 1)).toBeGreaterThan(0);
    });

    it('should handle very long documents', () => {
      const longDoc = 'word '.repeat(1000);
      const bm25 = new BM25([longDoc, 'short doc']);
      expect(() => bm25.score('word', 0)).not.toThrow();
    });
  });
});
