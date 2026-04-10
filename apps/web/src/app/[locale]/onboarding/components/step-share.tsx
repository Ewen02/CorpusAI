import * as React from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, CopyButton } from '@corpusai/ui';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth-client';
import type { CreatedAI } from './step-create-ai';
import { IndexingBanner } from './indexing-banner';

interface StepShareProps {
  ai: CreatedAI;
  isIndexing: boolean;
  indexedCount: number;
  totalCount: number;
  indexingProgress: number;
  onFinish: () => void;
}

export function StepShare({
  ai,
  isIndexing,
  indexedCount,
  totalCount,
  indexingProgress,
  onFinish,
}: StepShareProps) {
  const t = useTranslations('onboarding.share');
  const { data: session } = authClient.useSession();
  const sessionUsername =
    ((session?.user as Record<string, unknown> | undefined)?.username as string) ?? '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://corpusai.io';
  const chatUrl = `${origin}/chat/@${sessionUsername}/${ai.slug}`;
  const embedCode = `<script src="${origin}/embed.js" data-username="${sessionUsername}" data-ai="${ai.slug}" defer></script>`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          {t('title')}
        </h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">{t('subtitle')}</p>
      </div>

      <IndexingBanner indexed={indexedCount} total={totalCount} progress={indexingProgress} />

      <div className="space-y-4">
        <Card className="surface-raised">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[hsl(var(--text-secondary))]">
              {t('directLink')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Input
              value={chatUrl}
              readOnly
              className="font-mono text-xs text-[hsl(var(--text-secondary))]"
            />
            <CopyButton value={chatUrl} />
          </CardContent>
        </Card>

        <Card className="surface-raised">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[hsl(var(--text-secondary))]">
              {t('embedOnSite')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <pre className="overflow-x-auto rounded-lg bg-[hsl(var(--surface-0))] px-4 py-3 font-mono text-xs text-[hsl(var(--text-secondary))]">
              {embedCode}
            </pre>
            <div className="absolute right-6 top-5">
              <CopyButton value={embedCode} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button size="lg" className="w-full bg-primary" onClick={onFinish}>
        {t('finish')}
      </Button>
    </div>
  );
}
