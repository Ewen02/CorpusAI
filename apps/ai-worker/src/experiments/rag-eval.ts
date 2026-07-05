/* eslint-disable no-console -- standalone CLI eval script: console output is the interface */
/**
 * ============================================
 * RAG EVAL — HARNAIS D'ÉVALUATION SUR GOLDEN SET
 * ============================================
 *
 * Rejoue un golden set (questions + vérité terrain en mots-clés) contre le
 * pipeline RAG de production d'une AI et calcule les métriques :
 * hit rate (recall@k binaire), MRR, recall de mots-clés (contexte et réponse),
 * précision des refus hors-corpus, latence.
 *
 * Un cas peut porter un `history` (questions de suivi) : le pipeline condense
 * alors la question avant retrieval, ce qui teste la condensation en réel.
 *
 * Prérequis :
 * - .env : OPENAI_API_KEY, QDRANT_URL (COHERE_API_KEY optionnel)
 * - une AI avec ses documents déjà indexés (aiId visible dans l'URL du dashboard)
 *
 * Exécution :
 *   AI_ID=<aiId> pnpm --filter @corpusai/ai-worker experiment:eval
 *   AI_ID=<aiId> GOLDEN_SET=./src/experiments/golden-sets/droit-travail-composite.json pnpm ... experiment:eval
 *
 * Mode A/B (mesure l'impact d'une feature) :
 *   AI_ID=<aiId> AB_MODE=multiquery pnpm ... experiment:eval
 *   AB_MODE ∈ { multiquery, condense, threshold } — rejoue le set sous
 *   plusieurs configs et affiche un tableau comparatif.
 *
 * Options env :
 * - GOLDEN_SET : chemin du golden set JSON (défaut: droit-travail.json)
 * - AB_MODE : compare deux configs sur le même set (voir ci-dessus)
 * - EVAL_MIN_HIT_RATE : seuil sous lequel le process sort en code 1 (CI)
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluateCase,
  aggregateResults,
  type GoldenCase,
  type CaseResult,
  type EvalSummary,
  type QueryOptions,
} from '@corpusai/corpus';
import { createPipelineForAI, disposeRagFactory } from '../services/rag-factory';

interface GoldenSetFile {
  name: string;
  description?: string;
  cases: GoldenCase[];
}

/** Une variante de config à évaluer (mode A/B) */
interface Variant {
  label: string;
  options: Partial<QueryOptions>;
}

function formatPct(value: number | null): string {
  return value === null ? '  n/a' : `${(value * 100).toFixed(0).padStart(4)} %`;
}

/**
 * Rejoue tous les cas d'un golden set sous une config donnée et agrège.
 */
async function runGoldenSet(
  pipeline: ReturnType<typeof createPipelineForAI>,
  cases: GoldenCase[],
  baseOptions: Partial<QueryOptions>,
  verbose: boolean
): Promise<EvalSummary> {
  const results: CaseResult[] = [];

  for (const goldenCase of cases) {
    const start = Date.now();
    try {
      const hasHistory = Array.isArray(goldenCase.history) && goldenCase.history.length > 0;
      const response = await pipeline.query(goldenCase.question, {
        ...baseOptions,
        // Historique du cas → condensation active (sauf override explicite)
        conversationHistory: goldenCase.history,
        condenseFollowUp: baseOptions.condenseFollowUp ?? hasHistory,
      });
      const latencyMs = Date.now() - start;

      const result = evaluateCase(
        goldenCase,
        response.sources.map((s) => ({
          documentSource: s.documentSource,
          text: s.text,
          score: s.score,
        })),
        response.answer,
        {},
        latencyMs
      );
      results.push(result);

      if (verbose) {
        const status = goldenCase.outOfScope
          ? result.answer?.refusedCorrectly
            ? '✓ refus'
            : '✗ HALLUCINATION'
          : result.retrieval?.hit
            ? `✓ hit rank ${result.retrieval.firstRelevantRank}`
            : '✗ MISS';
        console.log(`  [${status.padEnd(18)}] ${goldenCase.id} (${latencyMs}ms)`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  [✗ ERREUR         ] ${goldenCase.id}: ${message}`);
    }
  }

  return aggregateResults(results);
}

function printSummary(summary: EvalSummary, total: number): void {
  console.log(`\n========== RÉSUMÉ ==========`);
  console.log(`Cas évalués            : ${summary.totalCases}/${total}`);
  console.log(
    `Hit rate (retrieval)   : ${formatPct(summary.hitRate)}  (${summary.scoredRetrievalCases} cas)`
  );
  console.log(`MRR                    : ${summary.mrr === null ? 'n/a' : summary.mrr.toFixed(3)}`);
  console.log(`Recall keywords ctx    : ${formatPct(summary.meanContextKeywordRecall)}`);
  console.log(
    `Recall keywords réponse: ${formatPct(summary.meanAnswerKeywordRecall)}  (${summary.scoredAnswerCases} cas)`
  );
  console.log(
    `Refus hors-corpus      : ${formatPct(summary.outOfScopeAccuracy)}  (${summary.outOfScopeCases} cas)`
  );
  console.log(
    `Latence moyenne        : ${summary.meanLatencyMs === null ? 'n/a' : `${Math.round(summary.meanLatencyMs)} ms`}`
  );
}

/** Variantes A/B par mode */
function variantsFor(mode: string): Variant[] {
  switch (mode) {
    case 'multiquery':
      return [
        { label: 'multi-query OFF', options: { multiQuery: false } },
        { label: 'multi-query ON', options: { multiQuery: true } },
      ];
    case 'condense':
      return [
        { label: 'condensation OFF', options: { condenseFollowUp: false } },
        { label: 'condensation ON', options: { condenseFollowUp: true } },
      ];
    case 'threshold':
      return [
        { label: 'seuil 0.4', options: { scoreThreshold: 0.4 } },
        { label: 'seuil 0.6', options: { scoreThreshold: 0.6 } },
      ];
    default:
      throw new Error(`AB_MODE inconnu: "${mode}" (attendu: multiquery | condense | threshold)`);
  }
}

/** Tableau comparatif A/B */
function printComparison(rows: Array<{ label: string; summary: EvalSummary }>): void {
  const pct = (v: number | null) => (v === null ? '  n/a' : `${(v * 100).toFixed(0)}%`);
  const num = (v: number | null) => (v === null ? 'n/a' : v.toFixed(3));
  console.log(`\n========== COMPARAISON A/B ==========`);
  console.log(
    `${'config'.padEnd(20)} ${'hit'.padStart(6)} ${'MRR'.padStart(7)} ${'recall'.padStart(8)} ${'latence'.padStart(9)}`
  );
  console.log('-'.repeat(54));
  for (const { label, summary } of rows) {
    console.log(
      `${label.padEnd(20)} ${pct(summary.hitRate).padStart(6)} ${num(summary.mrr).padStart(7)} ${pct(summary.meanContextKeywordRecall).padStart(8)} ${(summary.meanLatencyMs === null ? 'n/a' : `${Math.round(summary.meanLatencyMs)}ms`).padStart(9)}`
    );
  }
}

async function main(): Promise<void> {
  const aiId = process.env.AI_ID;
  if (!aiId) {
    console.error(
      'AI_ID manquant. Usage: AI_ID=<aiId> pnpm --filter @corpusai/ai-worker experiment:eval'
    );
    process.exit(1);
  }

  const goldenSetPath = resolve(
    process.env.GOLDEN_SET ?? resolve(__dirname, 'golden-sets/droit-travail.json')
  );
  const goldenSet = JSON.parse(readFileSync(goldenSetPath, 'utf-8')) as GoldenSetFile;

  console.log(`\n========== RAG EVAL ==========`);
  console.log(`Golden set : ${goldenSet.name} (${goldenSet.cases.length} cas)`);
  console.log(`AI         : ${aiId}`);

  const pipeline = createPipelineForAI(aiId);
  const abMode = process.env.AB_MODE;

  if (abMode) {
    // Mode A/B : rejoue le set sous chaque variante, compare
    console.log(`Mode A/B   : ${abMode}\n`);
    const variants = variantsFor(abMode);
    const rows: Array<{ label: string; summary: EvalSummary }> = [];
    for (const variant of variants) {
      console.log(`--- ${variant.label} ---`);
      const summary = await runGoldenSet(pipeline, goldenSet.cases, variant.options, true);
      rows.push({ label: variant.label, summary });
    }
    printComparison(rows);
    await disposeRagFactory();
    return;
  }

  // Mode simple : une passe détaillée
  console.log('');
  const summary = await runGoldenSet(pipeline, goldenSet.cases, {}, true);
  printSummary(summary, goldenSet.cases.length);
  await disposeRagFactory();

  const minHitRate = process.env.EVAL_MIN_HIT_RATE
    ? parseFloat(process.env.EVAL_MIN_HIT_RATE)
    : null;
  if (minHitRate !== null && summary.hitRate !== null && summary.hitRate < minHitRate) {
    console.error(
      `\n✗ Hit rate ${(summary.hitRate * 100).toFixed(0)} % < seuil ${(minHitRate * 100).toFixed(0)} % — régression retrieval`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Eval failed:', error);
  process.exit(1);
});
