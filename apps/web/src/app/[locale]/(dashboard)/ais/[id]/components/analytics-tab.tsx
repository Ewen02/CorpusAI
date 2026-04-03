'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { StatCard, AnalyticsCard, cn } from '@corpusai/ui';

import { useAIAnalytics, useDocumentChunkUsage, type AnalyticsPeriod } from '@/lib/queries';
import { PERIOD_OPTIONS } from '@/lib/constants';
import {
  FileIcon,
  MessageIcon,
  SparklesIcon,
  UsersIcon,
  AlertIcon,
  BookIcon,
  ThumbsUpIcon,
} from '@/lib/icons';
import {
  AnalyticsTabSkeleton,
  ChartsSkeleton,
} from '@/components/skeletons/analytics-tab-skeleton';

const AIAnalyticsCharts = dynamic(() => import('./ai-analytics-charts'), {
  ssr: false,
  loading: () => <ChartsSkeleton />,
});

interface AnalyticsTabProps {
  aiId: string;
}

export const AnalyticsTab = React.memo(function AnalyticsTab({ aiId }: AnalyticsTabProps) {
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const { data, isLoading } = useAIAnalytics(aiId, period);
  const [expandedDocId, setExpandedDocId] = React.useState<string | null>(null);
  const { data: chunkUsage, isLoading: isLoadingChunks } = useDocumentChunkUsage(
    aiId,
    expandedDocId,
    period
  );

  if (isLoading || !data) {
    return <AnalyticsTabSkeleton />;
  }

  const satisfactionRate = data.satisfaction?.rate;
  const unansweredRate = data.unanswered?.rate;
  const kb = data.knowledgeBase;
  const engagement = data.engagement;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex w-fit items-center gap-0.5 rounded-lg bg-[hsl(var(--surface-2))] p-1">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setPeriod(option.value)}
            aria-current={period === option.value ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-150',
              period === option.value
                ? 'bg-[hsl(var(--surface-1))] text-tx-primary shadow-sm ring-1 ring-[hsl(var(--border-default))]'
                : 'text-tx-muted hover:text-tx-secondary'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Row 1: Activity stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Conversations"
          value={data.totals.conversations}
          trend={data.trends.conversations ?? undefined}
          icon={MessageIcon}
        />
        <StatCard
          title="Questions"
          value={data.totals.questions}
          trend={data.trends.questions ?? undefined}
          icon={MessageIcon}
        />
        <StatCard
          title="Documents"
          value={data.totals.documents}
          trend={data.trends.documents ?? undefined}
          icon={FileIcon}
        />
      </div>

      {/* Row 2: Quality & Engagement stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard title="Qualité des réponses" icon={SparklesIcon}>
          <div className="mt-3">
            <span className="text-[28px] font-bold leading-none tracking-tight text-tx-primary">
              {satisfactionRate != null ? `${satisfactionRate}%` : '—'}
            </span>
          </div>
          <p className="mt-2 text-[13px] font-medium text-tx-secondary">réponses pertinentes</p>
          {data.satisfaction && data.satisfaction.total > 0 && (
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted/30">
              {data.satisfaction.high > 0 && (
                <div
                  className="bg-green-500"
                  title={`${data.satisfaction.high} pertinente${data.satisfaction.high > 1 ? 's' : ''}`}
                  style={{
                    width: `${(data.satisfaction.high / data.satisfaction.total) * 100}%`,
                  }}
                />
              )}
              {data.satisfaction.medium > 0 && (
                <div
                  className="bg-yellow-500"
                  title={`${data.satisfaction.medium} partielle${data.satisfaction.medium > 1 ? 's' : ''}`}
                  style={{
                    width: `${(data.satisfaction.medium / data.satisfaction.total) * 100}%`,
                  }}
                />
              )}
              {data.satisfaction.low > 0 && (
                <div
                  className="bg-red-500"
                  title={`${data.satisfaction.low} insuffisante${data.satisfaction.low > 1 ? 's' : ''}`}
                  style={{
                    width: `${(data.satisfaction.low / data.satisfaction.total) * 100}%`,
                  }}
                />
              )}
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard title="Engagement" icon={UsersIcon}>
          {(() => {
            const users = engagement?.uniqueUsers ?? 0;
            const convs = data.totals.conversations;
            const avg = engagement?.avgMessagesPerConversation ?? 0;
            const hasVisitors = users > 0;
            const hasConvs = convs > 0;
            const mainValue = hasVisitors ? users : hasConvs ? convs : '—';
            const mainLabel = hasVisitors
              ? `visiteur${users > 1 ? 's' : ''} unique${users > 1 ? 's' : ''}`
              : hasConvs
                ? `session${convs > 1 ? 's' : ''}`
                : 'aucune conversation';
            return (
              <>
                <div className="mt-3">
                  <span className="text-[28px] font-bold leading-none tracking-tight text-tx-primary">
                    {mainValue}
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-medium text-tx-secondary">{mainLabel}</p>
                {avg > 0 && <p className="mt-1 text-[11px] text-tx-muted">{avg} msg/conv</p>}
              </>
            );
          })()}
        </AnalyticsCard>

        <AnalyticsCard title="À améliorer" icon={AlertIcon}>
          <div className="mt-3">
            <span
              className={cn(
                'text-[28px] font-bold leading-none tracking-tight',
                unansweredRate != null && unansweredRate > 30
                  ? 'text-red-400'
                  : (data.unanswered?.count ?? 0) === 0
                    ? 'text-green-400'
                    : 'text-tx-primary'
              )}
            >
              {data.unanswered ? data.unanswered.count : '—'}
            </span>
          </div>
          <p className="mt-2 text-[13px] font-medium text-tx-secondary">
            question{(data.unanswered?.count ?? 0) > 1 ? 's' : ''} sans réponse
          </p>
          {unansweredRate != null && unansweredRate > 0 && (
            <p
              className={cn(
                'mt-1 text-[11px]',
                unansweredRate > 30 ? 'text-red-400' : 'text-yellow-400'
              )}
            >
              {unansweredRate}% du total
            </p>
          )}
        </AnalyticsCard>

        {/* User feedback satisfaction */}
        <AnalyticsCard title="Satisfaction utilisateurs" icon={ThumbsUpIcon}>
          {(() => {
            const fb = data.feedbackSatisfaction;
            if (!fb || fb.total === 0) {
              return (
                <>
                  <div className="mt-3">
                    <span className="text-[28px] font-bold leading-none tracking-tight text-tx-muted">
                      —
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] font-medium text-tx-secondary">aucun avis</p>
                </>
              );
            }
            return (
              <>
                <div className="mt-3">
                  <span
                    className={cn(
                      'text-[28px] font-bold leading-none tracking-tight',
                      fb.rate != null && fb.rate >= 70
                        ? 'text-green-400'
                        : fb.rate != null && fb.rate >= 40
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    )}
                  >
                    {fb.rate}%
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-medium text-tx-secondary">
                  {fb.positive} positif{fb.positive > 1 ? 's' : ''} / {fb.total} avis
                </p>
                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted/30">
                  <div
                    className="bg-green-500"
                    style={{ width: `${(fb.positive / fb.total) * 100}%` }}
                    title={`${fb.positive} positif${fb.positive > 1 ? 's' : ''}`}
                  />
                  <div
                    className="bg-red-500"
                    style={{ width: `${(fb.negative / fb.total) * 100}%` }}
                    title={`${fb.negative} négatif${fb.negative > 1 ? 's' : ''}`}
                  />
                </div>
              </>
            );
          })()}
        </AnalyticsCard>
      </div>

      {/* Knowledge base summary */}
      {kb && kb.documentCount > 0 && (
        <AnalyticsCard title="Base de connaissances" icon={BookIcon}>
          <p className="mt-3 text-[12px] text-tx-muted">
            {kb.documentCount} document{kb.documentCount > 1 ? 's' : ''}
            {kb.totalPages > 0 && ` · ${kb.totalPages} pages`}
            {kb.totalWords > 0 && ` · ${kb.totalWords.toLocaleString()} mots`}
            {kb.totalChunks > 0 && ` · ${kb.totalChunks} fragments`}
          </p>
        </AnalyticsCard>
      )}

      {/* Document Usage */}
      {data.documentUsage && data.documentUsage.length > 0 && (
        <AnalyticsCard title="Utilisation des documents" icon={FileIcon}>
          <p className="mt-1 text-[12px] text-tx-muted">Documents les plus cités par l'assistant</p>
          <div className="mt-3 space-y-2">
            {data.documentUsage.map((doc) => {
              const isExpanded = expandedDocId === doc.id;
              return (
                <div key={doc.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                    className="w-full rounded-lg bg-[hsl(var(--surface-0))] px-3 py-2 text-left transition-colors hover:bg-[hsl(var(--surface-2))]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-[13px] text-tx-secondary">
                        {doc.filename}
                      </span>
                      <span className="shrink-0 rounded-full bg-[hsl(var(--accent-500)/0.15)] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--accent-400))]">
                        {doc.citations}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/30">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--accent-500))] transition-all"
                          style={{ width: `${Math.max(doc.coveragePercent, 2)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] text-tx-muted">
                        {doc.uniqueChunks}/{doc.totalChunks} sections utilisées
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="mt-1 space-y-0.5 pl-2">
                      {isLoadingChunks ? (
                        <p className="px-2 py-3 text-[11px] text-tx-muted">Chargement...</p>
                      ) : chunkUsage && chunkUsage.length > 0 ? (
                        chunkUsage.map((chunk) => (
                          <div
                            key={chunk.id}
                            className={cn(
                              'flex items-start gap-2 rounded-md px-2 py-1.5 text-[11px]',
                              chunk.citations > 0
                                ? 'bg-[hsl(var(--accent-500)/0.08)]'
                                : 'opacity-40'
                            )}
                          >
                            <span className="shrink-0 pt-0.5 font-mono text-tx-muted">
                              §{chunk.position + 1}
                              {chunk.pageNumber != null && ` p.${chunk.pageNumber}`}
                            </span>
                            <span className="min-w-0 flex-1 text-tx-secondary">
                              {chunk.excerpt}
                            </span>
                            {chunk.citations > 0 && (
                              <span className="shrink-0 rounded-full bg-[hsl(var(--accent-500)/0.2)] px-1.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--accent-400))]">
                                {chunk.citations}×
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="px-2 py-3 text-[11px] text-tx-muted">Aucune section</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AnalyticsCard>
      )}

      {/* Charts */}
      <AIAnalyticsCharts daily={data.daily} />

      {/* Top Questions */}
      {data.topQuestions && data.topQuestions.length > 0 && (
        <AnalyticsCard title="Top questions" icon={MessageIcon}>
          <div className="mt-3 space-y-2">
            {data.topQuestions.map((q, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg bg-[hsl(var(--surface-0))] px-3 py-2"
              >
                <span className="min-w-0 truncate text-[13px] text-tx-secondary">{q.content}</span>
                <span className="shrink-0 rounded-full bg-[hsl(var(--accent-500)/0.15)] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--accent-400))]">
                  {q.count}
                </span>
              </div>
            ))}
          </div>
        </AnalyticsCard>
      )}

      {/* Retention — new vs returning users */}
      {data.retention && data.retention.length > 0 && (
        <AnalyticsCard title="Rétention" icon={UsersIcon}>
          <div className="mt-3 space-y-1.5">
            {data.retention.map((r) => {
              const total = r.newUsers + r.returningUsers;
              if (total === 0) return null;
              return (
                <div key={r.date} className="flex items-center gap-2 text-[11px]">
                  <span className="w-20 shrink-0 text-tx-muted">{r.date.slice(5)}</span>
                  <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-muted/30">
                    <div
                      className="bg-blue-500"
                      style={{ width: `${(r.newUsers / total) * 100}%` }}
                      title={`${r.newUsers} nouveaux`}
                    />
                    <div
                      className="bg-green-500"
                      style={{ width: `${(r.returningUsers / total) * 100}%` }}
                      title={`${r.returningUsers} récurrents`}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-tx-muted">{total}</span>
                </div>
              );
            })}
            <div className="flex gap-4 pt-1 text-[10px] text-tx-muted">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Nouveaux
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Récurrents
              </span>
            </div>
          </div>
        </AnalyticsCard>
      )}

      {/* Funnel */}
      {data.funnel && data.funnel.documentsUploaded > 0 && (
        <AnalyticsCard title="Funnel d'engagement" icon={SparklesIcon}>
          <div className="mt-3 space-y-3">
            {[
              { label: 'Documents indexés', value: data.funnel.documentsUploaded },
              { label: '1ère question posée', value: data.funnel.firstQuestion },
              { label: 'Conversations engagées (5+ msg)', value: data.funnel.engagedConversations },
            ].map((step, i) => {
              const pct =
                data.funnel.documentsUploaded > 0
                  ? Math.round((step.value / data.funnel.documentsUploaded) * 100)
                  : 0;
              return (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="text-tx-secondary">{step.label}</span>
                    <span className="font-semibold text-tx-primary">
                      {step.value} {i > 0 && <span className="text-tx-muted">({pct}%)</span>}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/30">
                    <div
                      className="h-full rounded-full bg-[hsl(var(--accent-500))] transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </AnalyticsCard>
      )}
    </div>
  );
});
