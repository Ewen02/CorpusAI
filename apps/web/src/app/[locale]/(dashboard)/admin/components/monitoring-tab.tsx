'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent, Skeleton, Badge, Button } from '@corpusai/ui';
import { apiClient } from '@/lib/api-client';
import {
  Activity,
  Database,
  HardDrive,
  Cpu,
  Zap,
  RefreshCw,
  CheckCircle2,
  FileText,
  AlertTriangle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  useFailedJobs,
  useRetryFailedJob,
  useDiscardFailedJob,
  type FailedJob,
} from '@/lib/queries/use-admin';
import type { HealthData, TestStatus } from '../types';
import { AUTO_REFRESH_INTERVAL } from '../constants';
import { formatUptime } from '../utils';
import { ServiceCard, StatusBadge, RefreshOverlay } from './service-card';

export function MonitoringTab() {
  const t = useTranslations('admin.monitoring');
  const locale = useLocale();
  const [data, setData] = React.useState<HealthData | null>(null);
  const [testData, setTestData] = React.useState<TestStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isRunningTests, setIsRunningTests] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState<Date | null>(null);

  const fetchHealth = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const result = await apiClient.get<HealthData>('/admin/health');
      setData(result);
      setLastRefresh(new Date());
    } catch {
      // Errors handled by parent admin guard
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchTests = React.useCallback(async () => {
    setIsRunningTests(true);
    try {
      const result = await apiClient.get<TestStatus>('/admin/tests');
      setTestData(result);
    } catch {
      // Tests section is optional
    } finally {
      setIsRunningTests(false);
    }
  }, []);

  React.useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  React.useEffect(() => {
    const interval = setInterval(() => fetchHealth(), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-tx-muted">
          {t('statusDescription')}
          {lastRefresh && (
            <span className="ml-2 text-tx-disabled">
              {t('updatedAt', { time: lastRefresh.toLocaleTimeString(locale) })}
            </span>
          )}
        </p>
        <button
          onClick={() => fetchHealth(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border-default))] px-3 py-1.5 text-[13px] text-tx-muted transition-colors hover:bg-[hsl(var(--surface-2))] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      {/* Global status */}
      {data && (
        <Card variant="glass" className="relative overflow-hidden">
          {isRefreshing && <RefreshOverlay />}
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${data.status === 'healthy' ? 'bg-[hsl(var(--success))] shadow-[0_0_8px_hsl(var(--success)/0.5)]' : 'bg-[hsl(var(--warning))] shadow-[0_0_8px_hsl(var(--warning)/0.5)]'}`}
              />
              <span className="text-[15px] font-semibold text-tx-primary">
                {data.status === 'healthy' ? t('allOperational') : t('degraded')}
              </span>
            </div>
            <div className="flex items-center gap-6 text-[12px] text-tx-muted">
              <span className="flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" />
                {t('uptime', { duration: formatUptime(data.uptime) })}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                {data.responseMs}ms
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service cards */}
      {data && (
        <div className="relative">
          {isRefreshing && <RefreshOverlay />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ServiceCard name="PostgreSQL" icon={Database} service={data.services.postgres} />
            <ServiceCard
              name="Qdrant"
              icon={HardDrive}
              service={data.services.qdrant}
              extra={
                data.services.qdrant.status === 'connected' && (
                  <div className="flex gap-4 text-[12px] text-tx-muted">
                    <span>
                      {t('collections', { count: data.services.qdrant.collections ?? 0 })}
                    </span>
                    <span>
                      {t('vectors', {
                        count: (data.services.qdrant.totalPoints ?? 0).toLocaleString(),
                      })}
                    </span>
                  </div>
                )
              }
            />
            <ServiceCard name="Redis" icon={Cpu} service={data.services.redis} />
            <ServiceCard name="OpenAI" icon={Zap} service={data.services.openai} />
          </div>
        </div>
      )}

      {/* Document queue */}
      {data && (
        <Card variant="glass" className="relative overflow-hidden">
          {isRefreshing && <RefreshOverlay />}
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <FileText className="h-4 w-4 text-tx-muted" />
              {t('documentQueue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <QueueStat value={data.documentQueue.pending} label={t('pending')} color="warning" />
              <QueueStat
                value={data.documentQueue.processing}
                label={t('processing')}
                color="accent-500"
              />
              <QueueStat value={data.documentQueue.failed} label={t('failed')} color="danger" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed jobs (DLQ) */}
      <FailedJobsSection />

      {/* Test suites */}
      <Card variant="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <CheckCircle2 className="h-4 w-4 text-tx-muted" />
              {t('unitTests')}
            </CardTitle>
            <button
              onClick={fetchTests}
              disabled={isRunningTests}
              className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border-default))] px-3 py-1.5 text-[12px] text-tx-muted transition-colors hover:bg-[hsl(var(--surface-2))] disabled:opacity-50"
            >
              {isRunningTests ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {t('running')}
                </>
              ) : (
                <>
                  <Activity className="h-3 w-3" />
                  {t('runTests')}
                </>
              )}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {!testData && !isRunningTests && (
            <p className="py-4 text-center text-[13px] text-tx-disabled">{t('runTestsHint')}</p>
          )}
          {isRunningTests && !testData && (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          )}
          {testData && (
            <div className={`relative space-y-4 ${isRunningTests ? 'pointer-events-none' : ''}`}>
              {isRunningTests && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[hsl(var(--background)/0.7)] backdrop-blur-[2px]">
                  <div className="flex items-center gap-2 text-[13px] text-tx-muted">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t('updating')}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-lg bg-[hsl(var(--surface-2))] p-4">
                <div
                  className={`h-3 w-3 rounded-full ${testData.status === 'all_passed' ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--danger))]'}`}
                />
                <span className="text-[14px] font-semibold text-tx-primary">
                  {t('testsPassed', { passed: testData.totalPassed, total: testData.totalTests })}
                </span>
                {testData.totalFailed > 0 && (
                  <Badge variant="destructive">
                    {t('testsFailed', { count: testData.totalFailed })}
                  </Badge>
                )}
                <span className="ml-auto text-[11px] text-tx-disabled">
                  {new Date(testData.timestamp).toLocaleTimeString(locale)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {testData.suites.map((suite) => (
                  <div
                    key={suite.name}
                    className="rounded-lg border border-[hsl(var(--border-subtle))] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-tx-primary">
                        {suite.name}
                      </span>
                      <StatusBadge
                        status={suite.status === 'passed' ? 'connected' : 'disconnected'}
                      />
                    </div>
                    <div className="mt-2 flex gap-4 text-[12px] text-tx-muted">
                      <span className="text-[hsl(var(--success))]">
                        {t('suitePassed', { count: suite.passed })}
                      </span>
                      {suite.failed > 0 && (
                        <span className="text-[hsl(var(--danger))]">
                          {t('suiteFailed', { count: suite.failed })}
                        </span>
                      )}
                      <span>{t('suiteFiles', { count: suite.files })}</span>
                    </div>
                    {suite.error && (
                      <p className="mt-2 truncate text-[11px] text-[hsl(var(--danger))]">
                        {suite.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FailedJobsSection() {
  const t = useTranslations('admin.monitoring');
  const { data, isLoading } = useFailedJobs();
  const retryJob = useRetryFailedJob();
  const discardJob = useDiscardFailedJob();

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  const jobs = data?.jobs ?? [];

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <AlertTriangle className="h-4 w-4 text-tx-muted" />
          {t('failedJobs')}
          {jobs.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {data?.total ?? jobs.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-tx-disabled">{t('noFailedJobs')}</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <FailedJobRow
                key={job.jobId}
                job={job}
                onRetry={() => retryJob.mutate(job.jobId)}
                onDiscard={() => discardJob.mutate(job.jobId)}
                isRetrying={retryJob.isPending}
                isDiscarding={discardJob.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FailedJobRow({
  job,
  onRetry,
  onDiscard,
  isRetrying,
  isDiscarding,
}: {
  job: FailedJob;
  onRetry: () => void;
  onDiscard: () => void;
  isRetrying: boolean;
  isDiscarding: boolean;
}) {
  const t = useTranslations('admin.monitoring');
  const locale = useLocale();
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[hsl(var(--border-subtle))] p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-tx-primary">{job.filename}</p>
        <p className="mt-1 truncate text-[12px] text-[hsl(var(--danger))]">{job.error}</p>
        <div className="mt-1.5 flex gap-3 text-[11px] text-tx-disabled">
          <span>{t('attempts', { count: job.attemptsMade })}</span>
          {job.failedAt && <span>{new Date(job.failedAt).toLocaleString(locale)}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onRetry}
          disabled={isRetrying}
          title={t('retryTitle')}
        >
          <RotateCcw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-tx-muted hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))]"
          onClick={onDiscard}
          disabled={isDiscarding}
          title={t('discardTitle')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function QueueStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-lg bg-[hsl(var(--surface-2))] p-4 text-center">
      <p className={`text-2xl font-bold text-[hsl(var(--${color}))]`}>{value}</p>
      <p className="mt-1 text-[12px] text-tx-muted">{label}</p>
    </div>
  );
}
