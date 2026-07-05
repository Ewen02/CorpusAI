import type {
  GoldenCase,
  RetrievedChunk,
  RetrievalCaseResult,
  AnswerCaseResult,
  CaseResult,
  EvalSummary,
  EvaluatorOptions,
} from './types';

/**
 * Marqueurs de refus par défaut — alignés sur les format rules de
 * `@corpusai/ai-rules` (« Je peux en revanche t'aider sur : » / « I can
 * however help you with: ») plus quelques formulations génériques.
 */
const DEFAULT_REFUSAL_MARKERS = [
  'je ne peux pas repondre',
  'je peux en revanche',
  'ne contient pas',
  "i can't answer",
  'i cannot answer',
  'i can however help',
  'does not contain',
];

/**
 * Normalise un texte pour le matching : minuscules + suppression des accents.
 * « Rémunération » et « remuneration » doivent matcher — le golden set ne doit
 * pas casser sur une différence d'accentuation.
 */
export function normalizeForMatch(text: string): string {
  // \u0300-\u036f = diacritiques combinants produits par la décomposition NFD
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function containsKeyword(haystackNormalized: string, keyword: string): boolean {
  return haystackNormalized.includes(normalizeForMatch(keyword));
}

/**
 * Évalue la qualité du retrieval pour un cas : hit@k, rang du premier chunk
 * pertinent (MRR), recall des mots-clés de contexte et des sources.
 * Retourne null si le cas est outOfScope ou sans vérité terrain retrieval.
 */
export function evaluateRetrieval(
  goldenCase: GoldenCase,
  retrieved: RetrievedChunk[]
): RetrievalCaseResult | null {
  const keywords = goldenCase.expectedContextKeywords ?? [];
  const sources = goldenCase.expectedSources ?? [];
  if (goldenCase.outOfScope || (keywords.length === 0 && sources.length === 0)) {
    return null;
  }

  const normalizedChunks = retrieved.map((c) => ({
    text: normalizeForMatch(c.text),
    source: normalizeForMatch(c.documentSource),
  }));

  // Un chunk est pertinent s'il contient un keyword attendu OU vient d'une source attendue
  const isRelevant = (chunk: { text: string; source: string }): boolean => {
    const keywordHit = keywords.some((k) => containsKeyword(chunk.text, k));
    const sourceHit = sources.some((s) => chunk.source === normalizeForMatch(s));
    return keywordHit || sourceHit;
  };

  let firstRelevantRank: number | null = null;
  for (let i = 0; i < normalizedChunks.length; i++) {
    if (isRelevant(normalizedChunks[i]!)) {
      firstRelevantRank = i + 1;
      break;
    }
  }

  // Recall des keywords sur le contexte agrégé (tous chunks confondus)
  const allText = normalizedChunks.map((c) => c.text).join('\n');
  const contextKeywordRecall =
    keywords.length > 0
      ? keywords.filter((k) => containsKeyword(allText, k)).length / keywords.length
      : null;

  const retrievedSources = new Set(normalizedChunks.map((c) => c.source));
  const sourceRecall =
    sources.length > 0
      ? sources.filter((s) => retrievedSources.has(normalizeForMatch(s))).length / sources.length
      : null;

  return {
    caseId: goldenCase.id,
    hit: firstRelevantRank !== null,
    firstRelevantRank,
    reciprocalRank: firstRelevantRank !== null ? 1 / firstRelevantRank : 0,
    contextKeywordRecall,
    sourceRecall,
  };
}

/**
 * Évalue la réponse générée : recall des mots-clés attendus, et pour les cas
 * outOfScope, le refus correct (marqueur de refus OU aucune source citée).
 */
export function evaluateAnswer(
  goldenCase: GoldenCase,
  answer: string,
  sourcesCount: number,
  options: EvaluatorOptions = {}
): AnswerCaseResult {
  const normalizedAnswer = normalizeForMatch(answer);

  const answerKeywords = goldenCase.expectedAnswerKeywords ?? [];
  const answerKeywordRecall =
    answerKeywords.length > 0
      ? answerKeywords.filter((k) => containsKeyword(normalizedAnswer, k)).length /
        answerKeywords.length
      : null;

  let refusedCorrectly: boolean | null = null;
  if (goldenCase.outOfScope) {
    const markers = options.refusalMarkers ?? DEFAULT_REFUSAL_MARKERS;
    const hasRefusalMarker = markers.some((m) => containsKeyword(normalizedAnswer, m));
    refusedCorrectly = hasRefusalMarker || sourcesCount === 0;
  }

  return {
    caseId: goldenCase.id,
    answerKeywordRecall,
    refusedCorrectly,
  };
}

/**
 * Évalue un cas complet (retrieval + réponse).
 */
export function evaluateCase(
  goldenCase: GoldenCase,
  retrieved: RetrievedChunk[],
  answer: string,
  options: EvaluatorOptions = {},
  latencyMs?: number
): CaseResult {
  return {
    caseId: goldenCase.id,
    question: goldenCase.question,
    outOfScope: goldenCase.outOfScope ?? false,
    retrieval: evaluateRetrieval(goldenCase, retrieved),
    answer: evaluateAnswer(goldenCase, answer, retrieved.length, options),
    latencyMs,
  };
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Agrège les résultats de cas en métriques globales : hit rate (recall@k
 * binaire), MRR, recalls moyens, précision des refus hors-corpus, latence.
 */
export function aggregateResults(results: CaseResult[]): EvalSummary {
  const retrievalResults = results
    .map((r) => r.retrieval)
    .filter((r): r is RetrievalCaseResult => r !== null);

  const answerRecalls = results
    .map((r) => r.answer?.answerKeywordRecall)
    .filter((v): v is number => typeof v === 'number');

  const outOfScopeResults = results
    .map((r) => r.answer?.refusedCorrectly)
    .filter((v): v is boolean => typeof v === 'boolean');

  const latencies = results
    .map((r) => r.latencyMs)
    .filter((v): v is number => typeof v === 'number');

  const contextRecalls = retrievalResults
    .map((r) => r.contextKeywordRecall)
    .filter((v): v is number => typeof v === 'number');

  const sourceRecalls = retrievalResults
    .map((r) => r.sourceRecall)
    .filter((v): v is number => typeof v === 'number');

  return {
    totalCases: results.length,
    scoredRetrievalCases: retrievalResults.length,
    hitRate: mean(retrievalResults.map((r) => (r.hit ? 1 : 0))),
    mrr: mean(retrievalResults.map((r) => r.reciprocalRank)),
    meanContextKeywordRecall: mean(contextRecalls),
    meanSourceRecall: mean(sourceRecalls),
    scoredAnswerCases: answerRecalls.length,
    meanAnswerKeywordRecall: mean(answerRecalls),
    outOfScopeCases: outOfScopeResults.length,
    outOfScopeAccuracy: mean(outOfScopeResults.map((v) => (v ? 1 : 0))),
    meanLatencyMs: mean(latencies),
  };
}
