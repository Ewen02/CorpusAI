'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { StatCard, cn } from '@corpusai/ui';
import { useAnalytics, type AnalyticsPeriod } from '@/lib/queries';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { PERIOD_OPTIONS } from '@/lib/constants';
import { FileIcon, MessageIcon } from '@/lib/icons';
import { PageWrapper } from '@/components/page-wrapper';

const AnalyticsCharts = dynamic(() => import('./charts'), {
  ssr: false,
  loading: () => <AnalyticsSkeleton />,
});

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const tPeriods = useTranslations('analytics.periods');
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const { data, isLoading, error } = useAnalytics(period);

  if (isLoading) {
    return (
      <PageWrapper>
        <AnalyticsSkeleton />
      </PageWrapper>
    );
  }

  if (error || !data) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border-default))] py-16 text-center">
          <p className="text-sm text-tx-muted">{t('errorLoading')}</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-tx-primary">{t('title')}</h1>
          <p className="mt-1 text-sm text-tx-muted">{t('subtitle')}</p>
        </div>

        {/* Period Selector — pill segment */}
        <div className="flex items-center gap-0.5 rounded-lg bg-[hsl(var(--surface-2))] p-1">
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
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Documents"
          value={data.totals.documents}
          trend={data.trends.documents ?? undefined}
          icon={FileIcon}
        />
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
      </div>

      {/* Charts — lazy loaded */}
      <AnalyticsCharts daily={data.daily} />
    </PageWrapper>
  );
}
