'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, StatCard } from '@corpusai/ui';
import { useDashboardStats, useAIs, useUsage, type UsageLimitItem } from '@/lib/queries';
import { DashboardSkeleton } from '@/components/skeletons';
import { AIPreviewCard, EmptyAIState } from '@/components';
import { BotIcon, FileIcon, MessageIcon, UsersIcon, PlusIcon } from '@/lib/icons';
import { PageWrapper } from '@/components/page-wrapper';

export default function DashboardPage() {
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenue ! Voici un apercu de votre activite.</p>
      </div>

      {/* Onboarding Banner — show for new users with 0 AIs */}
      {ais && ais.length === 0 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Bienvenue sur CorpusAI !</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Creez votre premier assistant IA en 3 etapes : nommez-le, uploadez vos documents,
                  et commencez a poser des questions.
                </p>
              </div>
              <Button onClick={handleCreateAI} className="ml-4 shrink-0">
                <PlusIcon className="mr-2 h-4 w-4" />
                Creer mon premier AI
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="AIs Actifs" value={stats?.aiCount ?? 0} icon={BotIcon} />
        <StatCard title="Documents" value={stats?.documentCount ?? 0} icon={FileIcon} />
        <StatCard title="Questions" value={stats?.questionCount ?? 0} icon={MessageIcon} />
        <StatCard title="Conversations" value={stats?.conversationCount ?? 0} icon={UsersIcon} />
      </div>

      {/* Usage Quotas */}
      {usage && (
        <Card>
          <CardContent className="py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Utilisation — Plan {usage.plan}</h3>
              <span className="text-xs text-muted-foreground">
                {usage.status === 'ACTIVE' ? 'Actif' : usage.status}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <UsageBar label="AIs" item={usage.limits.ais} />
              <UsageBar label="Questions / jour" item={usage.limits.questionsPerDay} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* AIs Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mes AIs</h2>
          <Button variant="default" onClick={handleCreateAI}>
            + Creer un AI
          </Button>
        </div>

        {!ais || ais.length === 0 ? (
          <EmptyAIState onCreateAI={handleCreateAI} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ais.map((ai) => (
              <AIPreviewCard key={ai.id} ai={ai} onClick={() => handleNavigateToAI(ai.id)} />
            ))}
            <Card
              className="flex min-h-[120px] cursor-pointer items-center justify-center border-dashed transition-all duration-200 hover:border-primary/30 hover:bg-primary/5"
              onClick={handleCreateAI}
            >
              <CardContent className="flex flex-col items-center py-6">
                <div className="mb-2 rounded-full bg-primary/10 p-2">
                  <PlusIcon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Nouveau</span>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

function UsageBar({ label, item }: { label: string; item: UsageLimitItem }) {
  const isUnlimited = item.max === -1;
  const percent = isUnlimited ? 0 : Math.min(100, Math.round((item.used / item.max) * 100));
  const isWarning = !isUnlimited && percent >= 80;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={isWarning ? 'text-warning font-medium' : 'text-muted-foreground'}>
          {isUnlimited ? `${item.used} / ∞` : `${item.used} / ${item.max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              isWarning ? 'bg-warning' : 'bg-primary'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
