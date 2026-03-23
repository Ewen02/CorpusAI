import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { InternalServerErrorException, BadRequestException } from '@nestjs/common';

export interface EvalMetrics {
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_recall: number | null;
}

export interface EvalSummary {
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_recall: number | null;
  avgLatencyMs: number;
  validCounts: {
    faithfulness: number;
    answer_relevancy: number;
    context_recall: number;
    total: number;
  };
}

export interface EvalResult {
  question: string;
  document_id: string;
  answer: string;
  sources: { documentSource: string; score: number; text: string }[];
  metrics: EvalMetrics;
  latencyMs: number;
  error?: string;
  metricError?: boolean;
}

export interface EvalReport {
  runId: string;
  aiSlug: string;
  config: { apiUrl: string; model: string };
  summary: EvalSummary;
  results: EvalResult[];
}

export interface EvalReportSummary {
  runId: string;
  aiSlug: string;
  summary: EvalSummary;
  resultsCount: number;
  createdAt: string;
}

export class EvalReportsService {
  private get reportsDir(): string {
    return (
      process.env['EVAL_REPORTS_DIR'] ?? path.join(process.cwd(), 'scripts', 'eval', 'reports')
    );
  }

  async listReports(slug?: string): Promise<EvalReportSummary[]> {
    try {
      await fs.access(this.reportsDir);
    } catch {
      return [];
    }

    const entries = await fs.readdir(this.reportsDir);
    const jsonFiles = entries.filter((f) => f.endsWith('.json') && f !== '.gitkeep');

    const reports: EvalReportSummary[] = [];

    for (const file of jsonFiles) {
      try {
        const raw = await fs.readFile(path.join(this.reportsDir, file), 'utf-8');
        const report = JSON.parse(raw) as EvalReport;
        if (slug && report.aiSlug !== slug) continue;
        reports.push({
          runId: report.runId,
          aiSlug: report.aiSlug,
          summary: report.summary,
          resultsCount: report.results.length,
          createdAt: report.runId,
        });
      } catch {
        // skip malformed files
      }
    }

    return reports.sort((a, b) => b.runId.localeCompare(a.runId));
  }

  async getReport(runId: string): Promise<EvalReport | null> {
    // Sanitize runId to prevent path traversal
    const safeId = runId.replace(/[^a-zA-Z0-9_\-]/g, '');
    const filePath = path.join(this.reportsDir, `run-${safeId}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as EvalReport;
    } catch {
      return null;
    }
  }

  private get evalScriptDir(): string {
    return (
      process.env['EVAL_SCRIPT_DIR'] ?? path.join(process.cwd(), '..', '..', 'scripts', 'eval')
    );
  }

  async listDatasets(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.evalScriptDir);
      return entries.filter((f) => /^dataset\.[a-zA-Z0-9_-]+\.json$/.test(f)).sort();
    } catch {
      return [];
    }
  }

  async runEval(slug: string, dataset: string): Promise<{ runId: string }> {
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      throw new BadRequestException('Invalid slug format');
    }
    if (!/^dataset\.[a-zA-Z0-9_-]+\.json$/.test(dataset)) {
      throw new BadRequestException('Invalid dataset filename');
    }

    const scriptDir = this.evalScriptDir;
    const runId = await new Promise<string>((resolve, reject) => {
      const proc = spawn('npx', ['tsx', 'run.ts', '--slug', slug, '--dataset', dataset], {
        cwd: scriptDir,
        env: { ...process.env, EVAL_REPORTS_DIR: this.reportsDir },
        timeout: 10 * 60_000,
      });

      let stderr = '';
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(
            new InternalServerErrorException(
              `Eval script failed (exit ${code}): ${stderr.slice(-500)}`
            )
          );
        } else {
          // Derive runId from latest report file
          fs.readdir(this.reportsDir)
            .then((files) => {
              const runs = files
                .filter((f) => f.startsWith('run-') && f.endsWith('.json'))
                .sort()
                .reverse();
              resolve(runs[0]?.replace(/^run-/, '').replace(/\.json$/, '') ?? 'unknown');
            })
            .catch(() => resolve('unknown'));
        }
      });

      proc.on('error', (err) => {
        reject(new InternalServerErrorException(`Failed to spawn eval script: ${err.message}`));
      });
    });

    return { runId };
  }
}
