import * as fs from 'node:fs';
import * as path from 'node:path';
import OpenAI from 'openai';
import { faithfulness, answerRelevancy, contextRecall } from './metrics.js';
import type { TestCase, EvalResult, EvalSummary, EvalReport, EvalMetrics } from './types.js';

// ─── Env loader (no dotenv dep) ──────────────────────────────────────────────

function loadEnv(): void {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// ─── Arg parser ───────────────────────────────────────────────────────────────

interface Args {
  dataset?: string;
  slug?: string;
  output?: string;
  compare?: [string, string];
  concurrency: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { concurrency: 3 };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--dataset':
        args.dataset = argv[++i];
        break;
      case '--slug':
        args.slug = argv[++i];
        break;
      case '--output':
        args.output = argv[++i];
        break;
      case '--concurrency':
        args.concurrency = parseInt(argv[++i]!, 10);
        break;
      case '--compare':
        args.compare = [argv[++i]!, argv[++i]!];
        break;
    }
  }
  return args;
}

// ─── Concurrency limiter ───────────────────────────────────────────────────────

async function withConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  const queue = tasks.map((task, i) => ({ task, i }));
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      results[item.i] = await item.task();
    }
  });
  await Promise.all(workers);
  return results;
}

// ─── Summary computation ──────────────────────────────────────────────────────

function computeSummary(results: EvalResult[]): EvalSummary {
  const valid = results.filter((r) => !r.error);
  const total = valid.length;

  function avg(key: keyof EvalMetrics): { value: number | null; count: number } {
    const values = valid.map((r) => r.metrics[key]).filter((v): v is number => v !== null);
    return {
      value: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null,
      count: values.length,
    };
  }

  const f = avg('faithfulness');
  const r = avg('answer_relevancy');
  const c = avg('context_recall');
  const avgLatencyMs =
    valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b.latencyMs, 0) / valid.length) : 0;

  return {
    faithfulness: f.value !== null ? Math.round(f.value * 1000) / 1000 : null,
    answer_relevancy: r.value !== null ? Math.round(r.value * 1000) / 1000 : null,
    context_recall: c.value !== null ? Math.round(c.value * 1000) / 1000 : null,
    avgLatencyMs,
    validCounts: {
      faithfulness: f.count,
      answer_relevancy: r.count,
      context_recall: c.count,
      total,
    },
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function fmtScore(value: number | null, count: number, total: number): string {
  if (value === null) return 'n/a';
  const score = value.toFixed(2);
  if (count < total) return `${score}  (avg over ${count}/${total} questions)`;
  return score;
}

function printSummary(summary: EvalSummary): void {
  const { validCounts: vc } = summary;
  console.log('\nSummary');
  console.log(`  faithfulness:      ${fmtScore(summary.faithfulness, vc.faithfulness, vc.total)}`);
  console.log(
    `  answer_relevancy:  ${fmtScore(summary.answer_relevancy, vc.answer_relevancy, vc.total)}`
  );
  console.log(
    `  context_recall:    ${fmtScore(summary.context_recall, vc.context_recall, vc.total)}`
  );
  console.log(`  avg latency:       ${summary.avgLatencyMs}ms`);
}

// ─── Compare mode ─────────────────────────────────────────────────────────────

function compareReports(fileA: string, fileB: string): void {
  const a = JSON.parse(fs.readFileSync(fileA, 'utf-8')) as EvalReport;
  const b = JSON.parse(fs.readFileSync(fileB, 'utf-8')) as EvalReport;

  console.log(`\nComparing: ${path.basename(fileA)} → ${path.basename(fileB)}`);

  function diffLine(
    label: string,
    va: number | null,
    vb: number | null,
    lowerIsBetter = false
  ): void {
    const pad = ' '.repeat(Math.max(0, 18 - label.length));
    if (va === null || vb === null) {
      console.log(`  ${label}:${pad}n/a → n/a`);
      return;
    }
    const delta = vb - va;
    const improved = lowerIsBetter ? delta < 0 : delta > 0;
    const worsened = lowerIsBetter ? delta > 0 : delta < 0;
    const sym = delta === 0 ? '—' : improved ? '✓' : worsened ? '✗' : '—';
    const sign = delta > 0 ? '+' : '';
    const deltaStr = lowerIsBetter ? `${sign}${Math.round(delta)}ms` : `${sign}${delta.toFixed(2)}`;
    const vaStr = lowerIsBetter ? `${Math.round(va)}ms` : va.toFixed(2);
    const vbStr = lowerIsBetter ? `${Math.round(vb)}ms` : vb.toFixed(2);
    console.log(`  ${label}:${pad}${vaStr} → ${vbStr}  (${deltaStr} ${sym})`);
  }

  diffLine('faithfulness', a.summary.faithfulness, b.summary.faithfulness);
  diffLine('answer_relevancy', a.summary.answer_relevancy, b.summary.answer_relevancy);
  diffLine('context_recall', a.summary.context_recall, b.summary.context_recall);
  diffLine('avg latency', a.summary.avgLatencyMs, b.summary.avgLatencyMs, true);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();
  const args = parseArgs();

  // Compare mode
  if (args.compare) {
    compareReports(args.compare[0], args.compare[1]);
    return;
  }

  // Validate required args
  if (!args.dataset) {
    console.error('Error: --dataset <path> is required');
    process.exit(1);
  }
  if (!args.slug) {
    console.error('Error: --slug <slug> is required');
    process.exit(1);
  }

  const apiUrl = process.env['CORPUSAI_API_URL'] ?? 'http://localhost:3001';
  const apiKey = process.env['CORPUSAI_API_KEY'] ?? '';
  const openaiKey = process.env['OPENAI_API_KEY'] ?? '';
  const evalModel = process.env['EVAL_MODEL'] ?? 'gpt-4o-mini';

  if (!apiKey) {
    console.error('Error: CORPUSAI_API_KEY is not set in .env');
    process.exit(1);
  }
  if (!openaiKey) {
    console.error('Error: OPENAI_API_KEY is not set in .env');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  // Load dataset
  const datasetPath = path.resolve(args.dataset);
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8')) as TestCase[];
  const total = dataset.length;

  console.log(`\nRunning evaluation: ${total} questions against AI "${args.slug}"`);

  // Process questions with concurrency
  const tasks = dataset.map((tc, idx) => async (): Promise<EvalResult> => {
    const start = Date.now();

    // Call RAG API
    let ragAnswer = '';
    let ragSources: { documentSource: string; score: number; text: string }[] = [];
    let errorMsg: string | undefined;

    try {
      const res = await fetch(`${apiUrl}/v1/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ slug: args.slug, question: tc.question }),
      });

      if (!res.ok) {
        const body = await res.text();
        errorMsg = `HTTP ${res.status}: ${body.slice(0, 200)}`;
      } else {
        const data = (await res.json()) as {
          answer: string;
          sources: { chunkId: string; documentSource: string; score: number; text: string }[];
        };
        ragAnswer = data.answer ?? '';
        ragSources = (data.sources ?? []).map((s) => ({
          documentSource: s.documentSource,
          score: s.score,
          text: s.text,
        }));
      }
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }

    const latencyMs = Date.now() - start;
    const questionPreview =
      tc.question.length > 60 ? tc.question.slice(0, 60) + '...' : tc.question;

    if (errorMsg) {
      console.log(`  [${idx + 1}/${total}] "${questionPreview}" → ERROR: ${errorMsg}`);
      return {
        question: tc.question,
        document_id: tc.document_id,
        answer: '',
        sources: [],
        metrics: { faithfulness: null, answer_relevancy: null, context_recall: null },
        latencyMs,
        error: errorMsg,
      };
    }

    // Compute metrics in parallel
    let metricError = false;
    const [f, r, c] = await Promise.all([
      faithfulness(ragAnswer, ragSources, openai, evalModel),
      answerRelevancy(tc.question, ragAnswer, openai, evalModel),
      contextRecall(tc.expected_answer, ragSources, openai, evalModel),
    ]);

    if (f === null || r === null || c === null) metricError = true;

    const fStr = f !== null ? f.toFixed(2) : 'null';
    const rStr = r !== null ? r.toFixed(2) : 'null';
    const cStr = c !== null ? c.toFixed(2) : 'null';
    console.log(
      `  [${idx + 1}/${total}] "${questionPreview}" → faithfulness=${fStr} relevancy=${rStr} recall=${cStr} (${latencyMs}ms)`
    );

    const result: EvalResult = {
      question: tc.question,
      document_id: tc.document_id,
      answer: ragAnswer,
      sources: ragSources,
      metrics: { faithfulness: f, answer_relevancy: r, context_recall: c },
      latencyMs,
    };
    if (metricError) result.metricError = true;
    return result;
  });

  const results = await withConcurrency(tasks, args.concurrency);
  const summary = computeSummary(results);
  printSummary(summary);

  // Build report
  const now = new Date();
  const runId = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const report: EvalReport = {
    runId,
    aiSlug: args.slug,
    config: { apiUrl, model: evalModel },
    summary,
    results,
  };

  // Write report
  const outputPath = args.output ?? path.join('reports', `run-${runId}.json`);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nReport saved → ${outputPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
