'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('ai.analyticsTab');
  const tPeriods = useTranslations('analytics.periods');
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
            {tPeriods(option.labelKey)}
          </button>
        ))}
      </div>

      {/* Row 1: Activity stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title={t('statConversations')}
          value={data.totals.conversations}
          trend={data.trends.conversations ?? undefined}
          icon={MessageIcon}
        />
        <StatCard
          title={t('statQuestions')}
          value={data.totals.questions}
          trend={data.trends.questions ?? undefined}
          icon={MessageIcon}
        />
        <StatCard
          title={t('statDocuments')}
          value={data.totals.documents}
          trend={data.trends.documents ?? undefined}
          icon={FileIcon}
        />
      </div>

      {/* Row 2: Quality & Engagement stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard title={t('responseQuality')} icon={SparklesIcon}>
          <div className="mt-3">
            <span className="text-[28px] font-bold leading-none tracking-tight text-tx-primary">
              {satisfactionRate != null ? `${satisfactionRate}%` : '—'}
            </span>
          </div>
          <p className="mt-2 text-[13px] font-medium text-tx-secondary">{t('relevantAnswers')}</p>
          {data.satisfaction && data.satisfaction.total > 0 && (
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
              {data.satisfaction.high > 0 && (
                <div
                  className="bg-green-500"
                  title={t('relevantCount', { count: data.satisfaction.high })}
                  style={{
                    width: `${(data.satisfaction.high / data.satisfaction.total) * 100}%`,
                  }}
                />
              )}
              {data.satisfaction.medium > 0 && (
                <div
                  className="bg-yellow-500"
                  title={t('partialCount', { count: data.satisfaction.medium })}
                  style={{
                    width: `${(data.satisfaction.medium / data.satisfaction.total) * 100}%`,
                  }}
                />
              )}
              {data.satisfaction.low > 0 && (
                <div
                  className="bg-red-500"
                  title={t('insufficientCount', { count: data.satisfaction.low })}
                  style={{
                    width: `${(data.satisfaction.low / data.satisfaction.total) * 100}%`,
                  }}
                />
              )}
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard title={t('engagement')} icon={UsersIcon}>
          {(() => {
            const users = engagement?.uniqueUsers ?? 0;
            const convs = data.totals.conversations;
            const avg = engagement?.avgMessagesPerConversation ?? 0;
            const hasVisitors = users > 0;
            const hasConvs = convs > 0;
            const mainValue = hasVisitors ? users : hasConvs ? convs : '—';
            const mainLabel = hasVisitors
              ? t('uniqueVisitors', { count: users })
              : hasConvs
                ? t('sessions', { count: convs })
                : t('noConversation');
            return (
              <>
                <div className="mt-3">
                  <span className="text-[28px] font-bold leading-none tracking-tight text-tx-primary">
                    {mainValue}
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-medium text-tx-secondary">{mainLabel}</p>
                {avg > 0 && (
                  <p className="mt-1 text-[11px] text-tx-muted">
                    {t('messagesPerConv', { count: avg })}
                  </p>
                )}
              </>
            );
          })()}
        </AnalyticsCard>

        <AnalyticsCard title={t('toImprove')} icon={AlertIcon}>
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
            {t('unansweredQuestions', { count: data.unanswered?.count ?? 0 })}
          </p>
          {unansweredRate != null && unansweredRate > 0 && (
            <p
              className={cn(
                'mt-1 text-[11px]',
                unansweredRate > 30 ? 'text-red-400' : 'text-yellow-400'
              )}
            >
              {t('percentOfTotal', { percent: unansweredRate })}
            </p>
          )}
        </AnalyticsCard>

        {/* User feedback satisfaction */}
        <AnalyticsCard title={t('userSatisfaction')} icon={ThumbsUpIcon}>
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
                  <p className="mt-2 text-[13px] font-medium text-tx-secondary">{t('noReviews')}</p>
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
                  {t('positiveReviews', { positive: fb.positive, total: fb.total })}
                </p>
                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                  <div
                    className="bg-green-500"
                    style={{ width: `${(fb.positive / fb.total) * 100}%` }}
                    title={t('positiveTooltip', { count: fb.positive })}
                  />
                  <div
                    className="bg-red-500"
                    style={{ width: `${(fb.negative / fb.total) * 100}%` }}
                    title={t('negativeTooltip', { count: fb.negative })}
                  />
                </div>
              </>
            );
          })()}
        </AnalyticsCard>
      </div>

      {/* Knowledge base summary */}
      {kb && kb.documentCount > 0 && (
        <AnalyticsCard title={t('knowledgeBase')} icon={BookIcon}>
          <p className="mt-3 text-[12px] text-tx-muted">
            {t('kbDocuments', { count: kb.documentCount })}
            {kb.totalPages > 0 && ` · ${t('kbPages', { count: kb.totalPages })}`}
            {kb.totalWords > 0 && ` · ${t('kbWords', { count: kb.totalWords.toLocaleString() })}`}
            {kb.totalChunks > 0 && ` · ${t('kbChunks', { count: kb.totalChunks })}`}
          </p>
        </AnalyticsCard>
      )}

      {/* Document Usage */}
      {data.documentUsage && data.documentUsage.length > 0 && (
        <AnalyticsCard title={t('documentUsage')} icon={FileIcon}>
          <p className="mt-1 text-[12px] text-tx-muted">{t('mostCited')}</p>
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
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--accent-500))] transition-all"
                          style={{ width: `${Math.max(doc.coveragePercent, 2)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] text-tx-muted">
                        {t('sectionsUsed', { used: doc.uniqueChunks, total: doc.totalChunks })}
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="mt-1 space-y-0.5 pl-2">
                      {isLoadingChunks ? (
                        <p className="px-2 py-3 text-[11px] text-tx-muted">
                          {t('loadingSections')}
                        </p>
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
                        <p className="px-2 py-3 text-[11px] text-tx-muted">{t('noSection')}</p>
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
        <AnalyticsCard title={t('topQuestions')} icon={MessageIcon}>
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
        <AnalyticsCard title={t('retention')} icon={UsersIcon}>
          <div className="mt-3 space-y-1.5">
            {data.retention.map((r) => {
              const total = r.newUsers + r.returningUsers;
              if (total === 0) return null;
              return (
                <div key={r.date} className="flex items-center gap-2 text-[11px]">
                  <span className="w-20 shrink-0 text-tx-muted">{r.date.slice(5)}</span>
                  <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                    <div
                      className="bg-blue-500"
                      style={{ width: `${(r.newUsers / total) * 100}%` }}
                      title={t('newUsersTooltip', { count: r.newUsers })}
                    />
                    <div
                      className="bg-green-500"
                      style={{ width: `${(r.returningUsers / total) * 100}%` }}
                      title={t('returningUsersTooltip', { count: r.returningUsers })}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-tx-muted">{total}</span>
                </div>
              );
            })}
            <div className="flex gap-4 pt-1 text-[10px] text-tx-muted">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> {t('newUsers')}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />{' '}
                {t('returningUsers')}
              </span>
            </div>
          </div>
        </AnalyticsCard>
      )}

      {/* Funnel */}
      {data.funnel && data.funnel.documentsUploaded > 0 && (
        <AnalyticsCard title={t('engagementFunnel')} icon={SparklesIcon}>
          <div className="mt-3 space-y-3">
            {[
              { label: t('funnelDocumentsIndexed'), value: data.funnel.documentsUploaded },
              { label: t('funnelFirstQuestion'), value: data.funnel.firstQuestion },
              { label: t('funnelEngagedConversations'), value: data.funnel.engagedConversations },
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
                  <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
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
