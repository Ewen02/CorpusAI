import { describe, it, expect, afterAll } from 'vitest';
import { SparseVectorGenerator } from './sparse';

describe('SparseVectorGenerator', () => {
  const raw = new SparseVectorGenerator();
  const normalized = new SparseVectorGenerator({ normalize: true });

  afterAll(() => {
    raw.dispose();
    normalized.dispose();
  });

  it('computes log-TF weights per token', () => {
    // « hello hello hello » : le token « ␣hello » apparaît 2 fois (tiktoken
    // distingue « hello » en début de texte de « ␣hello » précédé d'un espace)
    const sparse = raw.generate('hello hello hello');

    expect(sparse.indices.length).toBeGreaterThan(0);
    expect(sparse.indices.length).toBe(sparse.values.length);
    expect(Math.max(...sparse.values)).toBeCloseTo(Math.log1p(2));
  });

  it('keeps legacy behavior without the normalize option (case-sensitive)', () => {
    const upper = raw.generate('LICENCIEMENT');
    const lower = raw.generate('licenciement');

    // Sans normalisation, la casse change la tokenisation tiktoken
    expect(upper.indices).not.toEqual(lower.indices);
  });

  describe('normalize: true', () => {
    it('makes matching case- and accent-insensitive', () => {
      const a = normalized.generate('Licenciement du Salarié');
      const b = normalized.generate('licenciement salarie');

      expect([...a.indices].sort()).toEqual([...b.indices].sort());
    });

    it('removes FR/EN stopwords', () => {
      const withStops = normalized.generate('le contrat de travail dans une entreprise');
      const withoutStops = normalized.generate('contrat travail entreprise');

      expect([...withStops.indices].sort()).toEqual([...withoutStops.indices].sort());
    });

    it('preserves numbers as tokens', () => {
      const sparse = normalized.generate('le SMIC est de 11,88 euros');
      const numbersOnly = normalized.generate('11 88');

      // Les tokens numériques de la phrase incluent ceux de "11 88"
      for (const idx of numbersOnly.indices) {
        expect(sparse.indices).toContain(idx);
      }
    });

    it('returns an empty vector for stopword-only input', () => {
      const sparse = normalized.generate('le la les de du');

      expect(sparse.indices).toHaveLength(0);
    });
  });

  it('generateBatch matches generate element-wise', () => {
    const texts = ['premier texte', 'second texte'];
    const batch = raw.generateBatch(texts);

    expect(batch).toHaveLength(2);
    expect(batch[0]).toEqual(raw.generate(texts[0]!));
    expect(batch[1]).toEqual(raw.generate(texts[1]!));
  });
});
