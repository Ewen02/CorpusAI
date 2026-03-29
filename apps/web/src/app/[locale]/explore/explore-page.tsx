'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ExploreAICard, Skeleton, cn } from '@corpusai/ui';
import { useExploreAIs, useFeaturedAIs } from '@/lib/queries';
import { SearchIcon } from '@/lib/icons';
import type { AICategory } from '@corpusai/types';

const CATEGORY_VALUES: (AICategory | 'ALL')[] = [
  'ALL',
  'SUPPORT',
  'EDUCATION',
  'LEGAL',
  'FINANCE',
  'HEALTH',
  'TECH',
];

const SORT_VALUES = ['popular', 'newest'] as const;

export default function ExplorePage() {
  const t = useTranslations('explore');
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [category, setCategory] = React.useState<AICategory | 'ALL'>('ALL');
  const [sort, setSort] = React.useState<'popular' | 'newest'>('popular');
  const [page, setPage] = React.useState(1);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, sort]);

  const { data: featured, isLoading: isFeaturedLoading } = useFeaturedAIs();

  const { data: results, isLoading: isResultsLoading } = useExploreAIs({
    search: debouncedSearch || undefined,
    category: category !== 'ALL' ? category : undefined,
    sort,
    page,
    limit: 24,
  });

  const showFeatured = !debouncedSearch && category === 'ALL' && page === 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Public header */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--background)/0.85)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-8">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-sm">
              <span className="text-[11px] font-bold text-white">C</span>
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-tx-primary">
              CorpusAI
            </span>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/sign-in"
              className="text-[13px] font-medium text-tx-muted transition-colors hover:text-tx-primary"
            >
              {t('signIn')}
            </a>
            <a
              href="/sign-up"
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-3.5 py-1.5 text-[13px] font-medium text-white shadow-accent transition-all hover:opacity-90"
            >
              {t('createMine')}
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent-500)/0.25)] bg-[hsl(var(--accent-500)/0.07)] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <span className="text-[12px] font-medium text-indigo-400">{t('badge')}</span>
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-tx-primary sm:text-5xl">
            {t('heroTitle')}{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-indigo-300 bg-clip-text text-transparent">
              {t('heroTitleHighlight')}
            </span>
          </h1>
          <p className="mx-auto max-w-lg text-[15px] leading-relaxed text-tx-muted">
            {t('heroDescription')}
          </p>
        </div>

        {/* Featured section */}
        {showFeatured && (
          <section className="mb-12">
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-[13px] font-semibold text-tx-primary">{t('popular')}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-[hsl(var(--border-default))] to-transparent" />
            </div>
            {isFeaturedLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl" />
                ))}
              </div>
            ) : featured && featured.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.slice(0, 3).map((ai) => (
                  <ExploreAICard
                    key={ai.id}
                    slug={ai.slug}
                    name={ai.name}
                    description={ai.description}
                    creatorName={ai.user.name}
                    creatorUsername={ai.user.username ?? undefined}
                    category={ai.category}
                    conversationCount={ai.conversationCount}
                    onTry={() => router.push(`/chat/@${ai.user.username}/${ai.slug}`)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        )}

        {/* Toolbar: search + sort */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tx-disabled" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] pl-8 pr-4 text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
            />
          </div>

          {/* Sort — pill segment */}
          <div className="flex items-center gap-0.5 rounded-lg bg-[hsl(var(--surface-2))] p-1">
            {SORT_VALUES.map((sortValue) => (
              <button
                key={sortValue}
                onClick={() => setSort(sortValue)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[12px] font-medium transition-all duration-150',
                  sort === sortValue
                    ? 'bg-[hsl(var(--surface-1))] text-tx-primary shadow-sm ring-1 ring-[hsl(var(--border-default))]'
                    : 'text-tx-muted hover:text-tx-secondary'
                )}
              >
                {t(`sort.${sortValue}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Category filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORY_VALUES.map((catValue) => (
            <button
              key={catValue}
              onClick={() => setCategory(catValue)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-150',
                category === catValue
                  ? 'border-[hsl(var(--accent-500)/0.4)] bg-[hsl(var(--accent-500)/0.1)] text-indigo-400'
                  : 'border-[hsl(var(--border-default))] text-tx-muted hover:border-[hsl(var(--border-strong))] hover:text-tx-secondary'
              )}
            >
              {t(`category.${catValue}`)}
            </button>
          ))}
        </div>

        {/* Results */}
        {isResultsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : results?.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border-default))] py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--surface-2))]">
              <SearchIcon className="h-5 w-5 text-tx-disabled" />
            </div>
            <p className="mt-4 text-sm font-medium text-tx-secondary">{t('noResults')}</p>
            <p className="mt-1 text-[13px] text-tx-muted">{t('noResultsDescription')}</p>
            <button
              onClick={() => {
                setSearch('');
                setCategory('ALL');
              }}
              className="mt-4 text-[13px] font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              {t('resetFilters')}
            </button>
          </div>
        ) : (
          <>
            {results && results.meta.total > 0 && (
              <p className="mb-4 text-[12px] text-tx-disabled">
                {t('resultCount', { count: results.meta.total })}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results?.data.map((ai) => (
                <ExploreAICard
                  key={ai.id}
                  slug={ai.slug}
                  name={ai.name}
                  description={ai.description}
                  creatorName={ai.user.name}
                  creatorUsername={ai.user.username ?? undefined}
                  category={ai.category}
                  conversationCount={ai.conversationCount}
                  onTry={() => router.push(`/chat/@${ai.user.username}/${ai.slug}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            {results && results.meta.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] px-4 py-2 text-[13px] font-medium text-tx-muted transition-all hover:border-[hsl(var(--border-strong))] hover:text-tx-primary disabled:pointer-events-none disabled:opacity-40"
                >
                  {t('previous')}
                </button>
                <span className="text-[12px] text-tx-muted">
                  {page} / {results.meta.totalPages}
                </span>
                <button
                  disabled={page >= results.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] px-4 py-2 text-[13px] font-medium text-tx-muted transition-all hover:border-[hsl(var(--border-strong))] hover:text-tx-primary disabled:pointer-events-none disabled:opacity-40"
                >
                  {t('next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
