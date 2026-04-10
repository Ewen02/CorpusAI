'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
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
import { EmptyAIStateFull } from '@/components';
import { AICard } from '@corpusai/ui';
import { SearchIcon, PlusIcon } from '@/lib/icons';
import { PageWrapper } from '@/components/page-wrapper';
import { useRouter } from '@/i18n/routing';

export default function AIsPage() {
  const t = useTranslations('ai.list');
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const deferredSearch = React.useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const { data: ais, isLoading } = useAIs();

  const filteredAIs = React.useMemo(() => {
    if (!ais) return [];
    return ais.filter((ai) => {
      const matchesSearch =
        ai.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        ai.slug.toLowerCase().includes(deferredSearch.toLowerCase());
      const matchesStatus = statusFilter === 'all' || ai.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ais, deferredSearch, statusFilter]);

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

  const handleResetFilters = React.useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
  }, []);

  if (isLoading) {
    return <AIsPageSkeleton />;
  }

  const hasActiveFilters = deferredSearch !== '' || statusFilter !== 'all';

  return (
    <PageWrapper className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-tx-primary">{t('title')}</h1>
            {ais && ais.length > 0 && (
              <span className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[11px] tabular-nums text-tx-muted">
                {ais.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-tx-muted">{t('subtitle')}</p>
        </div>
        <Button
          onClick={handleCreateAI}
          className="shrink-0 bg-primary shadow-accent transition-all hover:opacity-90 hover:shadow-accent"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          {t('createAI')}
        </Button>
      </div>

      {/* Toolbar */}
      {ais && ais.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tx-disabled" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={handleSearchChange}
              className="h-9 pl-8 text-sm"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-full text-sm sm:w-[160px]">
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="ACTIVE">{t('statusActive')}</SelectItem>
              <SelectItem value="DRAFT">{t('statusDraft')}</SelectItem>
              <SelectItem value="PAUSED">{t('statusPaused')}</SelectItem>
              <SelectItem value="ARCHIVED">{t('statusArchived')}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <span className="text-[12px] text-tx-muted">
              {t('results', { count: filteredAIs.length })}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {!ais || ais.length === 0 ? (
        <EmptyAIStateFull onCreateAI={handleCreateAI} />
      ) : filteredAIs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border-default))] py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--surface-2))]">
            <SearchIcon className="h-5 w-5 text-tx-disabled" />
          </div>
          <p className="mt-4 text-sm font-medium text-tx-secondary">{t('noResults')}</p>
          <p className="mt-1 text-[13px] text-tx-muted">{t('noResultsDescription')}</p>
          <button
            onClick={handleResetFilters}
            className="mt-4 text-[13px] font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            {t('resetFilters')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAIs.map((ai) => (
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
        </div>
      )}
    </PageWrapper>
  );
}
