'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@corpusai/ui';
import {
  useEvalReports,
  useEvalReport,
  type EvalReportSummary,
  type EvalSummary,
} from '@/lib/queries';
import { REFUSAL_PHRASE } from '../constants';
import { scoreColor, fmtScore, fmtDelta, formatRunDate } from '../utils';
import { MetricCard } from './metric-card';
import { ScoreBar } from './score-bar';
import { RunEvalModal } from './run-eval-modal';

export function EvalTab() {
  const { data: allReports, isLoading } = useEvalReports();
  const [selectedSlug, setSelectedSlug] = React.useState<string>('');
  const [showRunEvalModal, setShowRunEvalModal] = React.useState(false);

  const slugs = React.useMemo(() => {
    if (!allReports) return [];
    return [...new Set(allReports.map((r) => r.aiSlug))].sort();
  }, [allReports]);

  React.useEffect(() => {
    if (slugs.length > 0 && !selectedSlug) setSelectedSlug(slugs[0]!);
  }, [slugs, selectedSlug]);

  const slugReports: EvalReportSummary[] = React.useMemo(() => {
    if (!allReports || !selectedSlug) return [];
    return allReports.filter((r) => r.aiSlug === selectedSlug);
  }, [allReports, selectedSlug]);

  const currentReport = slugReports[0] ?? null;
  const prevReport = slugReports[1] ?? null;
  const { data: fullReport } = useEvalReport(currentReport?.runId ?? '');

  const current: EvalSummary | undefined = currentReport?.summary;
  const prev: EvalSummary | undefined = prevReport?.summary;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!allReports || allReports.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowRunEvalModal(true)}>
            Lancer un run
          </Button>
        </div>
        <Card variant="glass">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">Aucun rapport disponible.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Lance le script d'evaluation depuis <code className="text-xs">scripts/eval/</code>{' '}
              pour generer ton premier rapport.
            </p>
          </CardContent>
        </Card>
        <RunEvalModal
          slug="your-ai-slug"
          open={showRunEvalModal}
          onOpenChange={setShowRunEvalModal}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {currentReport && (
            <p className="text-sm text-muted-foreground">
              {formatRunDate(currentReport.runId)} · {currentReport.resultsCount} questions
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSlug} onValueChange={setSelectedSlug}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Choisir un AI..." />
            </SelectTrigger>
            <SelectContent>
              {slugs.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowRunEvalModal(true)}>
            Lancer un run
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="Faithfulness"
          value={current?.faithfulness ?? null}
          delta={fmtDelta(current?.faithfulness ?? null, prev?.faithfulness ?? null)}
        />
        <MetricCard
          label="Answer Relevancy"
          value={current?.answer_relevancy ?? null}
          delta={fmtDelta(current?.answer_relevancy ?? null, prev?.answer_relevancy ?? null)}
        />
        <MetricCard
          label="Context Recall"
          value={current?.context_recall ?? null}
          delta={fmtDelta(current?.context_recall ?? null, prev?.context_recall ?? null)}
        />
        <MetricCard
          label="Latence moyenne"
          value={current?.avgLatencyMs ?? null}
          unit="ms"
          delta={fmtDelta(current?.avgLatencyMs ?? null, prev?.avgLatencyMs ?? null, true)}
        />
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Detail par question
          </h2>
          {fullReport ? (
            fullReport.results.map((result, idx) => {
              const { faithfulness: f, answer_relevancy: r, context_recall: c } = result.metrics;
              const isRefusal = result.answer.includes(REFUSAL_PHRASE);
              return (
                <Card key={idx} variant="glass">
                  <CardContent className="space-y-2 p-4">
                    <p className="line-clamp-2 text-sm font-medium">{result.question}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-mono text-xs ${scoreColor(f)}`}>
                        faithful {fmtScore(f)}
                      </span>
                      <span className="text-xs text-muted-foreground">&middot;</span>
                      <span className={`font-mono text-xs ${scoreColor(r)}`}>
                        relevant {fmtScore(r)}
                      </span>
                      <span className="text-xs text-muted-foreground">&middot;</span>
                      <span className={`font-mono text-xs ${scoreColor(c)}`}>
                        recall {fmtScore(c)}
                      </span>
                      <span className="text-xs text-muted-foreground">&middot;</span>
                      <span className="text-xs text-muted-foreground">{result.latencyMs}ms</span>
                      {isRefusal && (
                        <Badge variant="secondary" className="text-[10px]">
                          refus correct
                        </Badge>
                      )}
                      {result.error && (
                        <Badge variant="destructive" className="text-[10px]">
                          erreur
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-sm">Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreBar label="Faithfulness" score={current?.faithfulness ?? null} />
              <ScoreBar label="Answer Relevancy" score={current?.answer_relevancy ?? null} />
              <ScoreBar label="Context Recall" score={current?.context_recall ?? null} />
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-sm">Historique des runs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {slugReports.slice(0, 3).map((report, idx) => (
                <div
                  key={report.runId}
                  className={`rounded-md p-2 text-xs ${idx === 0 ? 'border border-primary/20 bg-primary/10' : 'bg-[hsl(var(--surface-2))]'}`}
                >
                  <p className="font-medium text-muted-foreground">
                    {formatRunDate(report.runId)}
                    {idx === 0 && <span className="ml-2 font-semibold text-primary">current</span>}
                  </p>
                  <div className="mt-1 flex gap-3 font-mono">
                    <span className={scoreColor(report.summary.faithfulness)}>
                      F {fmtScore(report.summary.faithfulness)}
                    </span>
                    <span className={scoreColor(report.summary.answer_relevancy)}>
                      R {fmtScore(report.summary.answer_relevancy)}
                    </span>
                    <span className={scoreColor(report.summary.context_recall)}>
                      C {fmtScore(report.summary.context_recall)}
                    </span>
                  </div>
                </div>
              ))}
              {slugReports.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun run pour ce slug.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <RunEvalModal
        slug={selectedSlug}
        open={showRunEvalModal}
        onOpenChange={setShowRunEvalModal}
      />
    </div>
  );
}
