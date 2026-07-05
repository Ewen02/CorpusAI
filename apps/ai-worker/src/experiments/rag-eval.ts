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
 * Prérequis :
 * - .env : OPENAI_API_KEY, QDRANT_URL (COHERE_API_KEY optionnel)
 * - une AI avec ses documents déjà indexés (aiId visible dans l'URL du dashboard)
 *
 * Exécution :
 *   AI_ID=<aiId> pnpm --filter @corpusai/ai-worker experiment:eval
 *   AI_ID=<aiId> GOLDEN_SET=./src/experiments/golden-sets/droit-travail.json pnpm --filter @corpusai/ai-worker experiment:eval
 *
 * Options env :
 * - GOLDEN_SET : chemin du golden set JSON (défaut: droit-travail.json)
 * - EVAL_MIN_HIT_RATE : seuil de hit rate sous lequel le process sort en code 1
 *   (utilisable en CI de régression, ex: 0.8)
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateCase, aggregateResults, type GoldenCase, type CaseResult } from '@corpusai/corpus';
import { createPipelineForAI, disposeRagFactory } from '../services/rag-factory';

interface GoldenSetFile {
  name: string;
  description?: string;
  cases: GoldenCase[];
}

function formatPct(value: number | null): string {
  return value === null ? '  n/a' : `${(value * 100).toFixed(0).padStart(4)} %`;
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
  console.log(`AI         : ${aiId}\n`);

  const pipeline = createPipelineForAI(aiId);
  const results: CaseResult[] = [];

  for (const goldenCase of goldenSet.cases) {
    const start = Date.now();
    try {
      const response = await pipeline.query(goldenCase.question, {
        // Pas d'historique dans un golden set : condensation inutile
        condenseFollowUp: false,
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

      const status = goldenCase.outOfScope
        ? result.answer?.refusedCorrectly
          ? '✓ refus'
          : '✗ HALLUCINATION'
        : result.retrieval?.hit
          ? `✓ hit rank ${result.retrieval.firstRelevantRank}`
          : '✗ MISS';
      console.log(`  [${status.padEnd(18)}] ${goldenCase.id} (${latencyMs}ms)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  [✗ ERREUR         ] ${goldenCase.id}: ${message}`);
    }
  }

  const summary = aggregateResults(results);

  console.log(`\n========== RÉSUMÉ ==========`);
  console.log(`Cas évalués            : ${summary.totalCases}/${goldenSet.cases.length}`);
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

  await disposeRagFactory();

  // Seuil de régression optionnel (CI)
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
