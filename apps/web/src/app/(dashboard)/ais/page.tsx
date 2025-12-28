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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@corpusai/ui';

// ============================================
// Types
// ============================================

interface AI {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  documentCount: number;
  conversationCount: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Components
// ============================================

function AICard({ ai, onClick }: { ai: AI; onClick: () => void }) {
  const statusConfig = {
    ACTIVE: { label: 'Actif', variant: 'default' as const, dot: 'bg-green-500' },
    DRAFT: { label: 'Brouillon', variant: 'secondary' as const, dot: 'bg-yellow-500' },
    PAUSED: { label: 'En pause', variant: 'secondary' as const, dot: 'bg-gray-500' },
    ARCHIVED: { label: 'Archivé', variant: 'outline' as const, dot: 'bg-gray-400' },
  };

  const status = statusConfig[ai.status];
  const updatedAt = new Date(ai.updatedAt);
  const timeAgo = getTimeAgo(updatedAt);

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <BotIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{ai.name}</CardTitle>
              <p className="text-xs text-muted-foreground">/chat/{ai.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {ai.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {ai.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileIcon className="h-3 w-3" />
            {ai.documentCount} docs
          </span>
          <span className="flex items-center gap-1">
            <MessageIcon className="h-3 w-3" />
            {ai.questionCount} questions
          </span>
          <span className="flex items-center gap-1">
            <UsersIcon className="h-3 w-3" />
            {ai.conversationCount} conv.
          </span>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Modifié {timeAgo}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreateAI }: { onCreateAI: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted p-4 mb-4">
          <BotIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Aucun AI créé</h3>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
          Créez votre premier assistant IA en quelques minutes. Uploadez vos
          documents et laissez l'IA répondre aux questions.
        </p>
        <Button onClick={onCreateAI} size="lg">
          <PlusIcon className="h-4 w-4 mr-2" />
          Créer mon premier AI
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// Helpers
// ============================================

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
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

// ============================================
// Main Component
// ============================================

export default function AIsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  // TODO: Fetch real data from API
  const ais: AI[] = [
    {
      id: 'ai-1',
      name: 'FAQ Support Client',
      slug: 'faq-support',
      description: 'Assistant pour répondre aux questions fréquentes des clients',
      status: 'ACTIVE',
      documentCount: 15,
      conversationCount: 45,
      questionCount: 234,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
    },
    {
      id: 'ai-2',
      name: 'Documentation Technique',
      slug: 'doc-technique',
      description: 'Assistant basé sur notre documentation technique API',
      status: 'DRAFT',
      documentCount: 8,
      conversationCount: 0,
      questionCount: 0,
      createdAt: '2024-01-18T09:00:00Z',
      updatedAt: '2024-01-19T16:00:00Z',
    },
    {
      id: 'ai-3',
      name: 'Onboarding Guide',
      slug: 'onboarding',
      description: null,
      status: 'ACTIVE',
      documentCount: 5,
      conversationCount: 12,
      questionCount: 89,
      createdAt: '2024-01-10T11:00:00Z',
      updatedAt: '2024-01-20T09:00:00Z',
    },
  ];

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredAIs = ais.filter((ai) => {
    const matchesSearch =
      ai.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ai.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ai.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateAI = () => {
    router.push('/ais/new');
  };

  if (isLoading) {
    return <AIsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes AIs</h1>
          <p className="text-muted-foreground">
            Gérez vos assistants IA et leurs documents
          </p>
        </div>
        <Button onClick={handleCreateAI}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Créer un AI
        </Button>
      </div>

      {/* Filters */}
      {ais.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les status</SelectItem>
              <SelectItem value="ACTIVE">Actif</SelectItem>
              <SelectItem value="DRAFT">Brouillon</SelectItem>
              <SelectItem value="PAUSED">En pause</SelectItem>
              <SelectItem value="ARCHIVED">Archivé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* AI List */}
      {ais.length === 0 ? (
        <EmptyState onCreateAI={handleCreateAI} />
      ) : filteredAIs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground">Aucun résultat trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAIs.map((ai) => (
            <AICard
              key={ai.id}
              ai={ai}
              onClick={() => router.push(`/ais/${ai.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AIsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-44" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-3 w-48" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
