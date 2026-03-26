'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { StatCard, Skeleton, cn } from '@corpusai/ui';

import { useAIAnalytics, type AnalyticsPeriod } from '@/lib/queries';
import { PERIOD_OPTIONS } from '@/lib/constants';
import { FileIcon, MessageIcon, SparklesIcon, UsersIcon, AlertIcon, BookIcon } from '@/lib/icons';

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

      {/* Row 2: Quality & Engagement stats — same card style with icons */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Qualité des réponses */}
        <div className="relative overflow-hidden rounded-lg border border-[hsl(var(--accent-500)/0.2)] bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(224_15%_12%)] p-5 shadow-[var(--shadow-accent-sm)]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,hsl(var(--accent-500)/0.1),transparent_70%)]" />
          <div className="relative flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium text-tx-muted">Qualité des réponses</p>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
              <SparklesIcon className="h-4 w-4 text-indigo-400" />
            </div>
          </div>
          <div className="relative mt-3">
            <span className="text-[28px] font-bold leading-none tracking-tight text-tx-primary">
              {satisfactionRate != null ? `${satisfactionRate}%` : '—'}
            </span>
          </div>
          <p className="relative mt-2 text-[13px] font-medium text-tx-secondary">
            réponses pertinentes
          </p>
          {data.satisfaction && data.satisfaction.total > 0 && (
            <div className="relative mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted/30">
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
        </div>

        {/* Engagement */}
        <div className="relative overflow-hidden rounded-lg border border-[hsl(var(--accent-500)/0.2)] bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(224_15%_12%)] p-5 shadow-[var(--shadow-accent-sm)]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,hsl(var(--accent-500)/0.1),transparent_70%)]" />
          <div className="relative flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium text-tx-muted">Engagement</p>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
              <UsersIcon className="h-4 w-4 text-indigo-400" />
            </div>
          </div>
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
                <div className="relative mt-3">
                  <span className="text-[28px] font-bold leading-none tracking-tight text-tx-primary">
                    {mainValue}
                  </span>
                </div>
                <p className="relative mt-2 text-[13px] font-medium text-tx-secondary">
                  {mainLabel}
                </p>
                {avg > 0 && (
                  <p className="relative mt-1 text-[11px] text-tx-muted">{avg} msg/conv</p>
                )}
              </>
            );
          })()}
        </div>

        {/* Questions sans réponse */}
        <div className="relative overflow-hidden rounded-lg border border-[hsl(var(--accent-500)/0.2)] bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(224_15%_12%)] p-5 shadow-[var(--shadow-accent-sm)]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,hsl(var(--accent-500)/0.1),transparent_70%)]" />
          <div className="relative flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium text-tx-muted">À améliorer</p>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
              <AlertIcon className="h-4 w-4 text-indigo-400" />
            </div>
          </div>
          <div className="relative mt-3">
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
          <p className="relative mt-2 text-[13px] font-medium text-tx-secondary">
            question{(data.unanswered?.count ?? 0) > 1 ? 's' : ''} sans réponse
          </p>
          {unansweredRate != null && unansweredRate > 0 && (
            <p
              className={cn(
                'relative mt-1 text-[11px]',
                unansweredRate > 30 ? 'text-red-400' : 'text-yellow-400'
              )}
            >
              {unansweredRate}% du total
            </p>
          )}
        </div>
      </div>

      {/* Knowledge base summary */}
      {kb && kb.documentCount > 0 && (
        <div className="relative overflow-hidden rounded-lg border border-[hsl(var(--accent-500)/0.2)] bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(224_15%_12%)] p-5 shadow-[var(--shadow-accent-sm)]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,hsl(var(--accent-500)/0.1),transparent_70%)]" />
          <div className="relative flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium text-tx-muted">Base de connaissances</p>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
              <BookIcon className="h-4 w-4 text-indigo-400" />
            </div>
          </div>
          <p className="relative mt-3 text-[12px] text-tx-muted">
            {kb.documentCount} document{kb.documentCount > 1 ? 's' : ''}
            {kb.totalPages > 0 && ` · ${kb.totalPages} pages`}
            {kb.totalWords > 0 && ` · ${kb.totalWords.toLocaleString()} mots`}
            {kb.totalChunks > 0 && ` · ${kb.totalChunks} fragments`}
          </p>
        </div>
      )}

      {/* Charts */}
      <AIAnalyticsCharts daily={data.daily} />
    </div>
  );
});

function AnalyticsTabSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      <ChartsSkeleton />
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[340px] w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[240px] w-full rounded-xl" />
        <Skeleton className="h-[240px] w-full rounded-xl" />
      </div>
    </div>
  );
}
