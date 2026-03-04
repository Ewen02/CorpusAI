'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, Button, StatCard } from '@corpusai/ui';
import { useAnalytics, type AnalyticsPeriod } from '@/lib/queries';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { PERIOD_OPTIONS } from '@/lib/constants';
import { FileIcon, MessageIcon, CalendarIcon } from '@/lib/icons';
import { PageWrapper } from '@/components/page-wrapper';

const AnalyticsCharts = dynamic(() => import('./charts'), {
  ssr: false,
  loading: () => <AnalyticsSkeleton />,
});

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const { data, isLoading, error } = useAnalytics(period);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <AnalyticsSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Erreur lors du chargement des analytics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageWrapper className="container mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Suivez l&apos;évolution de votre activité</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(option.value)}
              className="gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Documents"
          value={data.totals.documents}
          trend={data.trends.documents}
          icon={FileIcon}
        />
        <StatCard
          title="Conversations"
          value={data.totals.conversations}
          trend={data.trends.conversations}
          icon={MessageIcon}
        />
        <StatCard
          title="Questions"
          value={data.totals.questions}
          trend={data.trends.questions}
          icon={MessageIcon}
        />
      </div>

      {/* Charts — lazy loaded */}
      <AnalyticsCharts daily={data.daily} />
    </PageWrapper>
  );
}
