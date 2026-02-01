'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, StatCard } from '@corpusai/ui';
import { useDashboardStats, useAIs } from '@/lib/queries';
import { DashboardSkeleton } from '@/components/skeletons';
import { AIPreviewCard, EmptyAIState } from '@/components';
import { BotIcon, FileIcon, MessageIcon, UsersIcon, PlusIcon } from '@/lib/icons';
import { PageWrapper } from '@/components/page-wrapper';

export default function DashboardPage() {
  const router = useRouter();

  const { data: stats, isLoading: isLoadingStats } = useDashboardStats();
  const { data: ais, isLoading: isLoadingAIs } = useAIs();

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
        <p className="text-muted-foreground">
          Bienvenue ! Voici un apercu de votre activite.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="AIs Actifs"
          value={stats?.aiCount ?? 0}
          icon={BotIcon}
        />
        <StatCard
          title="Documents"
          value={stats?.documentCount ?? 0}
          icon={FileIcon}
        />
        <StatCard
          title="Questions"
          value={stats?.questionCount ?? 0}
          icon={MessageIcon}
        />
        <StatCard
          title="Conversations"
          value={stats?.conversationCount ?? 0}
          icon={UsersIcon}
        />
      </div>

      {/* AIs Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Mes AIs</h2>
          <Button variant="glow" onClick={handleCreateAI}>
            + Creer un AI
          </Button>
        </div>

        {!ais || ais.length === 0 ? (
          <EmptyAIState onCreateAI={handleCreateAI} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ais.map((ai) => (
              <AIPreviewCard
                key={ai.id}
                ai={ai}
                onClick={() => handleNavigateToAI(ai.id)}
              />
            ))}
            <Card
              className="border-dashed cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center min-h-[120px]"
              onClick={handleCreateAI}
            >
              <CardContent className="flex flex-col items-center py-6">
                <div className="rounded-full bg-primary/10 p-2 mb-2">
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
