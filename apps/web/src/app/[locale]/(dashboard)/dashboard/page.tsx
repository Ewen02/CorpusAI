'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, StatCard, AICard, cn } from '@corpusai/ui';
import { useDashboardStats, useAIs, useUsage, type UsageLimitItem } from '@/lib/queries';
import { DashboardSkeleton } from '@/components/skeletons';
import { EmptyAIState } from '@/components';
import { BotIcon, FileIcon, MessageIcon, UsersIcon, PlusIcon } from '@/lib/icons';
import { PageWrapper } from '@/components/page-wrapper';
import { useRouter } from '@/i18n/routing';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const router = useRouter();

  const { data: stats, isLoading: isLoadingStats } = useDashboardStats();
  const { data: ais, isLoading: isLoadingAIs } = useAIs();
  const { data: usage } = useUsage();

  const isLoading = isLoadingStats || isLoadingAIs;

  const handleCreateAI = React.useCallback(() => {
    router.push('/ais/new');
  }, [router]);

  const handleNavigateToAI = React.useCallback(
    (id: string) => {
      router.push(`/ais/${id}`);
    },
    [router]
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <PageWrapper className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-tx-primary">{t('title')}</h1>
          <p className="mt-1 text-sm text-tx-muted">{t('welcome')}</p>
        </div>
        <Button
          onClick={handleCreateAI}
          className="bg-gradient-primary shrink-0 shadow-accent transition-all hover:opacity-90 hover:shadow-accent"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          {t('createAI')}
        </Button>
      </div>

      {/* Onboarding Banner */}
      {ais && ais.length === 0 && (
        <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-500)/0.25)] bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(235_20%_12%)] p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,hsl(var(--accent-500)/0.08),transparent)]" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-tx-primary">{t('onboardingTitle')}</h2>
              <p className="mt-1 max-w-lg text-sm text-tx-muted">{t('onboardingDescription')}</p>
            </div>
            <Button onClick={handleCreateAI} className="bg-gradient-primary shrink-0 shadow-accent">
              <PlusIcon className="mr-2 h-4 w-4" />
              {t('createMyFirstAI')}
            </Button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('activeAIs')} value={stats?.aiCount ?? 0} icon={BotIcon} />
        <StatCard title={t('totalDocuments')} value={stats?.documentCount ?? 0} icon={FileIcon} />
        <StatCard
          title={t('totalQuestions')}
          value={stats?.questionCount ?? 0}
          icon={MessageIcon}
        />
        <StatCard
          title={t('totalConversations')}
          value={stats?.conversationCount ?? 0}
          icon={UsersIcon}
        />
      </div>

      {/* Usage Quotas */}
      {usage && (
        <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-tx-primary">{t('usage')}</h3>
              <span className="rounded-md border border-[hsl(var(--accent-500)/0.3)] bg-[hsl(var(--accent-500)/0.1)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-400">
                {usage.plan}
              </span>
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                usage.status === 'ACTIVE' ? 'text-success' : 'text-tx-muted'
              )}
            >
              {usage.status === 'ACTIVE' ? `● ${t('active')}` : usage.status}
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <UsageBar
              label={t('aisCreated')}
              item={usage.limits.ais}
              nearLimit={t('nearLimit')}
              almostReached={t('almostReached')}
            />
            <UsageBar
              label={t('questionsPerDay')}
              item={usage.limits.questionsPerDay}
              nearLimit={t('nearLimit')}
              almostReached={t('almostReached')}
            />
          </div>
        </div>
      )}

      {/* AIs Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-tx-primary">{t('myAIs')}</h2>
            {ais && ais.length > 0 && (
              <span className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[11px] tabular-nums text-tx-muted">
                {ais.length}
              </span>
            )}
          </div>
          {ais && ais.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleCreateAI}>
              <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
              {t('newAI')}
            </Button>
          )}
        </div>

        {!ais || ais.length === 0 ? (
          <EmptyAIState onCreateAI={handleCreateAI} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ais.map((ai) => (
              <AICard
                key={ai.id}
                name={ai.name}
                slug={ai.slug}
                description={ai.description}
                status={ai.status}
                documentCount={ai.documentCount}
                questionCount={ai.questionCount}
                conversationCount={ai.conversationCount}
                updatedAt={ai.updatedAt}
                onClick={() => handleNavigateToAI(ai.id)}
              />
            ))}
            <button
              onClick={handleCreateAI}
              className="group flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(var(--border-default))] bg-transparent p-6 text-tx-disabled transition-all duration-150 hover:border-[hsl(var(--accent-500)/0.4)] hover:bg-[hsl(var(--accent-500)/0.04)] hover:text-tx-muted"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[hsl(var(--border-strong))] transition-all duration-150 group-hover:border-[hsl(var(--accent-500)/0.5)] group-hover:bg-[hsl(var(--accent-500)/0.08)]">
                <PlusIcon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{t('newAI')}</span>
            </button>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

function UsageBar({
  label,
  item,
  nearLimit,
  almostReached,
}: {
  label: string;
  item: UsageLimitItem;
  nearLimit: string;
  almostReached: string;
}) {
  const isUnlimited = item.max === -1;
  const percent = isUnlimited ? 0 : Math.min(100, Math.round((item.used / item.max) * 100));
  const isWarning = !isUnlimited && percent >= 80;
  const isDanger = !isUnlimited && percent >= 95;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-tx-secondary">{label}</span>
        <span
          className={cn(
            'tabular-nums',
            isDanger
              ? 'font-semibold text-danger'
              : isWarning
                ? 'font-medium text-warning'
                : 'text-tx-muted'
          )}
        >
          {isUnlimited ? `${item.used} / ∞` : `${item.used} / ${item.max}`}
        </span>
      </div>

      {isUnlimited ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
          <div className="h-full w-full rounded-full bg-[hsl(var(--accent-500)/0.2)]" />
        </div>
      ) : (
        <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isDanger
                ? 'bg-danger'
                : isWarning
                  ? 'bg-warning'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-400'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {isWarning && !isDanger && <p className="text-[11px] text-warning">{nearLimit}</p>}
      {isDanger && <p className="text-[11px] font-medium text-danger">{almostReached}</p>}
    </div>
  );
}
