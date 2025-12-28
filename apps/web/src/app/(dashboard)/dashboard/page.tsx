'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton,
} from '@corpusai/ui';

// ============================================
// Types
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
}

interface AIPreview {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'paused';
  documentCount: number;
  questionCount: number;
}

// ============================================
// Components
// ============================================

function StatCard({ title, value, description, trend, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span
                className={
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                }
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%{' '}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AIPreviewCard({ ai, onClick }: { ai: AIPreview; onClick: () => void }) {
  const statusConfig = {
    active: { label: 'Actif', variant: 'default' as const, dot: 'bg-green-500' },
    draft: { label: 'Brouillon', variant: 'secondary' as const, dot: 'bg-yellow-500' },
    paused: { label: 'En pause', variant: 'secondary' as const, dot: 'bg-gray-500' },
  };

  const status = statusConfig[ai.status];

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{ai.name}</CardTitle>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{ai.documentCount} documents</span>
          <span>•</span>
          <span>{ai.questionCount} questions</span>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyAIState({ onCreateAI }: { onCreateAI: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10">
        <div className="rounded-full bg-muted p-3 mb-4">
          <BotIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">Aucun AI créé</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Créez votre premier assistant IA pour commencer
        </p>
        <Button onClick={onCreateAI}>Créer un AI</Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// Icons
// ============================================

function BotIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ============================================
// Main Component
// ============================================

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);

  // TODO: Fetch real data from API
  const stats = {
    ais: 3,
    documents: 42,
    questions: 1234,
    conversations: 89,
  };

  const ais: AIPreview[] = [
    { id: 'ai-1', name: 'FAQ Support', status: 'active', documentCount: 15, questionCount: 234 },
    { id: 'ai-2', name: 'Doc Technique', status: 'draft', documentCount: 8, questionCount: 0 },
    { id: 'ai-3', name: 'Onboarding', status: 'active', documentCount: 5, questionCount: 89 },
  ];

  React.useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateAI = () => {
    router.push('/ais/new');
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenue ! Voici un aperçu de votre activité.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="AIs Actifs"
          value={stats.ais}
          trend={{ value: 12, isPositive: true }}
          description="depuis le mois dernier"
          icon={<BotIcon className="h-4 w-4" />}
        />
        <StatCard
          title="Documents"
          value={stats.documents}
          trend={{ value: 8, isPositive: true }}
          description="indexés"
          icon={<FileIcon className="h-4 w-4" />}
        />
        <StatCard
          title="Questions"
          value={stats.questions.toLocaleString()}
          trend={{ value: 23, isPositive: true }}
          description="ce mois"
          icon={<MessageIcon className="h-4 w-4" />}
        />
        <StatCard
          title="Conversations"
          value={stats.conversations}
          description="actives"
          icon={<UsersIcon className="h-4 w-4" />}
        />
      </div>

      {/* AIs Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Mes AIs</h2>
          <Button variant="outline" onClick={handleCreateAI}>
            + Créer un AI
          </Button>
        </div>

        {ais.length === 0 ? (
          <EmptyAIState onCreateAI={handleCreateAI} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ais.map((ai) => (
              <AIPreviewCard
                key={ai.id}
                ai={ai}
                onClick={() => router.push(`/ais/${ai.id}`)}
              />
            ))}
            <Card
              className="border-dashed cursor-pointer hover:bg-accent/50 transition-colors flex items-center justify-center min-h-[120px]"
              onClick={handleCreateAI}
            >
              <CardContent className="flex flex-col items-center py-6">
                <div className="rounded-full bg-muted p-2 mb-2">
                  <PlusIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Nouveau</span>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
