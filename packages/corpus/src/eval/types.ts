/**
 * Types pour l'évaluation du pipeline RAG (golden set → métriques).
 *
 * La vérité terrain est exprimée en mots-clés et sources attendues plutôt qu'en
 * IDs de chunks : les IDs changent à chaque ré-indexation (contenu, chunking),
 * les mots-clés survivent.
 */

/** Cas de test du golden set */
export interface GoldenCase {
  /** Identifiant stable du cas (ex: "smic-horaire-2025") */
  id: string;
  /** Question posée au pipeline */
  question: string;
  /**
   * Mots-clés attendus dans les chunks récupérés (contexte). Un chunk est
   * « pertinent » s'il contient au moins un de ces mots-clés.
   * Matching insensible à la casse et aux accents.
   */
  expectedContextKeywords?: string[];
  /** Noms de documents sources attendus dans le top-k (ex: "guide.pdf") */
  expectedSources?: string[];
  /** Mots-clés attendus dans la réponse générée */
  expectedAnswerKeywords?: string[];
  /**
   * Question hors corpus : le système doit refuser de répondre
   * (aucune source pertinente ou phrase de refus).
   */
  outOfScope?: boolean;
  /**
   * Historique de conversation précédant la question (cas de suivi).
   * Quand présent, le pipeline condense la question avant le retrieval :
   * ce champ teste la condensation des follow-ups en conditions réelles.
   */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/** Chunk récupéré par le pipeline, sous la forme minimale nécessaire à l'éval */
export interface RetrievedChunk {
  documentSource: string;
  text: string;
  score: number;
}

/** Résultat d'évaluation du retrieval pour un cas */
export interface RetrievalCaseResult {
  caseId: string;
  /** Au moins un chunk pertinent dans le top-k */
  hit: boolean;
  /** Rang (1-indexé) du premier chunk pertinent, null si aucun */
  firstRelevantRank: number | null;
  /** 1/firstRelevantRank, 0 si aucun chunk pertinent */
  reciprocalRank: number;
  /** Fraction des expectedContextKeywords présents dans l'ensemble du contexte récupéré */
  contextKeywordRecall: number | null;
  /** Fraction des expectedSources présents dans les chunks récupérés */
  sourceRecall: number | null;
}

/** Résultat d'évaluation de la réponse générée pour un cas */
export interface AnswerCaseResult {
  caseId: string;
  /** Fraction des expectedAnswerKeywords présents dans la réponse (null si non spécifié) */
  answerKeywordRecall: number | null;
  /**
   * Pour un cas outOfScope : true si le système a refusé correctement
   * (marqueur de refus dans la réponse, ou aucune source). null sinon.
   */
  refusedCorrectly: boolean | null;
}

/** Résultat complet d'un cas (retrieval + réponse + latence) */
export interface CaseResult {
  caseId: string;
  question: string;
  outOfScope: boolean;
  retrieval: RetrievalCaseResult | null;
  answer: AnswerCaseResult | null;
  latencyMs?: number;
}

/** Agrégats sur l'ensemble du golden set */
export interface EvalSummary {
  totalCases: number;
  /** Cas in-scope avec vérité terrain retrieval (keywords ou sources) */
  scoredRetrievalCases: number;
  /** Moyenne des hits (recall@k binaire) */
  hitRate: number | null;
  /** Mean Reciprocal Rank */
  mrr: number | null;
  meanContextKeywordRecall: number | null;
  meanSourceRecall: number | null;
  /** Cas avec expectedAnswerKeywords évalués */
  scoredAnswerCases: number;
  meanAnswerKeywordRecall: number | null;
  /** Cas outOfScope évalués */
  outOfScopeCases: number;
  /** Fraction des cas outOfScope correctement refusés */
  outOfScopeAccuracy: number | null;
  /** Latence moyenne (ms) sur les cas qui l'ont mesurée */
  meanLatencyMs: number | null;
}

/** Options de l'évaluateur */
export interface EvaluatorOptions {
  /**
   * Marqueurs de refus reconnus dans les réponses (insensible casse/accents).
   * Défaut : formulations FR/EN des format rules CorpusAI.
   */
  refusalMarkers?: string[];
}
