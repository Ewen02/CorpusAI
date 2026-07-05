import { describe, it, expect } from 'vitest';
import {
  normalizeForMatch,
  evaluateRetrieval,
  evaluateAnswer,
  evaluateCase,
  aggregateResults,
} from './evaluator';
import type { GoldenCase, RetrievedChunk, CaseResult } from './types';

const chunk = (text: string, source = 'guide.pdf', score = 0.8): RetrievedChunk => ({
  text,
  documentSource: source,
  score,
});

describe('normalizeForMatch', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeForMatch('Rémunération Été')).toBe('remuneration ete');
  });

  it('keeps digits and punctuation', () => {
    expect(normalizeForMatch('11,88 €')).toBe('11,88 €');
  });
});

describe('evaluateRetrieval', () => {
  const goldenCase: GoldenCase = {
    id: 'smic',
    question: 'Quel est le SMIC horaire ?',
    expectedContextKeywords: ['11,88', 'SMIC'],
  };

  it('computes hit and reciprocal rank from the first relevant chunk', () => {
    const result = evaluateRetrieval(goldenCase, [
      chunk('Les congés payés sont de 2,5 jours par mois'),
      chunk('Le SMIC horaire brut est de 11,88 €'),
    ]);

    expect(result).not.toBeNull();
    expect(result!.hit).toBe(true);
    expect(result!.firstRelevantRank).toBe(2);
    expect(result!.reciprocalRank).toBeCloseTo(0.5);
  });

  it('is accent- and case-insensitive on keywords', () => {
    const accentCase: GoldenCase = {
      id: 'conges',
      question: 'Congés ?',
      expectedContextKeywords: ['congés payés'],
    };
    const result = evaluateRetrieval(accentCase, [chunk('Les CONGES PAYES sont acquis...')]);

    expect(result!.hit).toBe(true);
    expect(result!.contextKeywordRecall).toBe(1);
  });

  it('computes keyword recall over the aggregated context', () => {
    const result = evaluateRetrieval(goldenCase, [
      chunk('Le SMIC est le salaire minimum'), // "SMIC" présent, "11,88" absent
    ]);

    expect(result!.contextKeywordRecall).toBeCloseTo(0.5);
  });

  it('matches relevance by expected source', () => {
    const sourceCase: GoldenCase = {
      id: 'src',
      question: 'Q',
      expectedSources: ['guide.pdf'],
    };
    const result = evaluateRetrieval(sourceCase, [chunk('texte quelconque', 'guide.pdf')]);

    expect(result!.hit).toBe(true);
    expect(result!.sourceRecall).toBe(1);
  });

  it('returns zero reciprocal rank when nothing is relevant', () => {
    const result = evaluateRetrieval(goldenCase, [chunk('rien à voir'), chunk('toujours rien')]);

    expect(result!.hit).toBe(false);
    expect(result!.firstRelevantRank).toBeNull();
    expect(result!.reciprocalRank).toBe(0);
  });

  it('returns null for outOfScope cases and cases without ground truth', () => {
    expect(
      evaluateRetrieval({ id: 'oos', question: 'Q', outOfScope: true }, [chunk('x')])
    ).toBeNull();
    expect(evaluateRetrieval({ id: 'empty', question: 'Q' }, [chunk('x')])).toBeNull();
  });
});

describe('evaluateAnswer', () => {
  it('computes answer keyword recall', () => {
    const goldenCase: GoldenCase = {
      id: 'a',
      question: 'Q',
      expectedAnswerKeywords: ['11,88', '1 801,80'],
    };
    const result = evaluateAnswer(goldenCase, 'Le SMIC horaire est de 11,88 € brut.', 2);

    expect(result.answerKeywordRecall).toBeCloseTo(0.5);
    expect(result.refusedCorrectly).toBeNull();
  });

  it('detects a correct refusal on outOfScope via refusal marker', () => {
    const goldenCase: GoldenCase = { id: 'oos', question: 'TVA ?', outOfScope: true };
    const result = evaluateAnswer(
      goldenCase,
      "Je ne peux pas répondre à cette question. Je peux en revanche t'aider sur : ...",
      3
    );

    expect(result.refusedCorrectly).toBe(true);
  });

  it('detects a correct refusal on outOfScope via zero sources', () => {
    const goldenCase: GoldenCase = { id: 'oos', question: 'TVA ?', outOfScope: true };
    const result = evaluateAnswer(goldenCase, 'Réponse quelconque sans marqueur.', 0);

    expect(result.refusedCorrectly).toBe(true);
  });

  it('flags a hallucinated answer on outOfScope', () => {
    const goldenCase: GoldenCase = { id: 'oos', question: 'TVA ?', outOfScope: true };
    const result = evaluateAnswer(goldenCase, 'Le taux de TVA est de 20 %.', 3);

    expect(result.refusedCorrectly).toBe(false);
  });
});

describe('aggregateResults', () => {
  it('aggregates hit rate, MRR, recalls and out-of-scope accuracy', () => {
    const cases: GoldenCase[] = [
      { id: 'c1', question: 'Q1', expectedContextKeywords: ['smic'] },
      { id: 'c2', question: 'Q2', expectedContextKeywords: ['cdd'] },
      { id: 'c3', question: 'Q3', outOfScope: true },
    ];
    const results: CaseResult[] = [
      evaluateCase(cases[0]!, [chunk('le smic est...')], 'réponse', {}, 100),
      evaluateCase(
        cases[1]!,
        [chunk('hors sujet'), chunk('le cdd dure 18 mois')],
        'réponse',
        {},
        200
      ),
      evaluateCase(cases[2]!, [], 'Je ne peux pas répondre à cette question.', {}, 50),
    ];

    const summary = aggregateResults(results);

    expect(summary.totalCases).toBe(3);
    expect(summary.scoredRetrievalCases).toBe(2);
    expect(summary.hitRate).toBe(1);
    expect(summary.mrr).toBeCloseTo((1 + 0.5) / 2);
    expect(summary.outOfScopeCases).toBe(1);
    expect(summary.outOfScopeAccuracy).toBe(1);
    expect(summary.meanLatencyMs).toBeCloseTo((100 + 200 + 50) / 3);
  });

  it('returns null aggregates on empty input', () => {
    const summary = aggregateResults([]);

    expect(summary.totalCases).toBe(0);
    expect(summary.hitRate).toBeNull();
    expect(summary.mrr).toBeNull();
    expect(summary.outOfScopeAccuracy).toBeNull();
  });
});
