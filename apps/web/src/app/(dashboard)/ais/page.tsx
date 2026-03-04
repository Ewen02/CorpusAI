'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@corpusai/ui';
import { useAIs } from '@/lib/queries';
import { AIsPageSkeleton } from '@/components/skeletons';
import { AICard, EmptyAIStateFull } from '@/components';
import { SearchIcon, PlusIcon } from '@/lib/icons';
import type { AI } from '@corpusai/types';
import { PageWrapper } from '@/components/page-wrapper';

export default function AIsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const { data: ais, isLoading } = useAIs();

  const filteredAIs = React.useMemo(() => {
    if (!ais) return [];
    return ais.filter((ai) => {
      const matchesSearch =
        ai.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ai.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || ai.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ais, searchQuery, statusFilter]);

  const handleCreateAI = React.useCallback(() => {
    router.push('/ais/new');
  }, [router]);

  const handleNavigateToAI = React.useCallback(
    (id: string) => {
      router.push(`/ais/${id}`);
    },
    [router]
  );

  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  if (isLoading) {
    return <AIsPageSkeleton />;
  }

  return (
    <PageWrapper className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes AIs</h1>
          <p className="text-muted-foreground">Gerez vos assistants IA et leurs documents</p>
        </div>
        <Button variant="default" onClick={handleCreateAI}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Creer un AI
        </Button>
      </div>

      {/* Filters */}
      {ais && ais.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative max-w-sm flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={handleSearchChange}
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
              <SelectItem value="ARCHIVED">Archive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* AI List */}
      {!ais || ais.length === 0 ? (
        <EmptyAIStateFull onCreateAI={handleCreateAI} />
      ) : filteredAIs.length === 0 ? (
        <Card variant="glass">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground">Aucun resultat trouve</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAIs.map((ai) => (
            <AICard key={ai.id} ai={ai} onClick={() => handleNavigateToAI(ai.id)} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
