'use client';

import * as React from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { ExploreAICard, Avatar, AvatarFallback, AvatarImage, Skeleton } from '@corpusai/ui';
import { useCreatorProfile } from '@/lib/queries';

interface ProfilePageProps {
  username: string;
}

export default function ProfilePage({ username }: ProfilePageProps) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();
  const { data: creator, isLoading, isError } = useCreatorProfile(username);

  return (
    <div className="min-h-screen bg-background">
      {/* Public header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 lg:px-8">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              C
            </div>
            <span className="text-sm font-semibold tracking-tight">CorpusAI</span>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/explore"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('explore')}
            </a>
            <a
              href="/sign-up"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('createMine')}
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        {isLoading ? (
          <ProfileSkeleton />
        ) : isError || !creator ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">{t('notFound')}</p>
            <a href="/explore" className="mt-4 inline-block text-sm text-primary underline">
              {t('backToExplore')}
            </a>
          </div>
        ) : (
          <>
            {/* Creator info */}
            <div className="mb-10 flex items-start gap-5">
              <Avatar className="h-16 w-16 ring-2 ring-border">
                <AvatarImage src={creator.image ?? undefined} />
                <AvatarFallback className="bg-primary/15 text-xl font-semibold text-primary">
                  {(creator.name || creator.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {creator.name || creator.username}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">@{creator.username}</p>
                {creator.bio && (
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground/80">
                    {creator.bio}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground/60">
                  <span>{t('publicAIs', { count: creator.ais.length })}</span>
                  <span>
                    {t('memberSince', {
                      date: new Date(creator.createdAt).toLocaleDateString(locale, {
                        month: 'long',
                        year: 'numeric',
                      }),
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* AI grid */}
            {creator.ais.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">{t('noPublicAIs')}</p>
              </div>
            ) : (
              <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {creator.ais.map((ai) => (
                  <ExploreAICard
                    key={ai.id}
                    slug={ai.slug}
                    name={ai.name}
                    description={ai.description}
                    category={ai.category}
                    conversationCount={ai.conversationCount}
                    onTry={() => router.push(`/chat/@${username}/${ai.slug}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div>
      <div className="mb-10 flex items-start gap-5">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
