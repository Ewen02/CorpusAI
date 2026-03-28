'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { StatCard, AnalyticsCard, cn } from '@corpusai/ui';

import { useAIAnalytics, type AnalyticsPeriod } from '@/lib/queries';
import { PERIOD_OPTIONS } from '@/lib/constants';
import { FileIcon, MessageIcon, SparklesIcon, UsersIcon, AlertIcon, BookIcon } from '@/lib/icons';
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
      <div className="grid gap-4 md:grid-cols-3">
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

      {/* Charts */}
      <AIAnalyticsCharts daily={data.daily} />
    </div>
  );
});
