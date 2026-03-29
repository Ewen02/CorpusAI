'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@corpusai/ui';
import { BotIcon, PlusIcon } from '@/lib/icons';

interface EmptyAIStateProps {
  onCreateAI: () => void;
}

export function EmptyAIState({ onCreateAI }: EmptyAIStateProps) {
  const t = useTranslations('ai.list');
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
        <BotIcon className="h-5 w-5 text-indigo-400" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-tx-primary">{t('empty')}</h3>
      <p className="mt-1 text-[13px] text-tx-muted">{t('emptyDescription')}</p>
      <Button
        onClick={onCreateAI}
        size="sm"
        className="mt-4 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-accent transition-all hover:opacity-90"
      >
        <PlusIcon className="mr-2 h-3.5 w-3.5" />
        {t('createAI')}
      </Button>
    </div>
  );
}

interface EmptyAIStateFullProps {
  onCreateAI: () => void;
}

export function EmptyAIStateFull({ onCreateAI }: EmptyAIStateFullProps) {
  const t = useTranslations('ai.list');
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] py-16 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--accent-500)/0.06),transparent)]" />

      <div className="relative flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
          <BotIcon className="h-7 w-7 text-indigo-400" />
        </div>

        <h3 className="mt-5 text-lg font-semibold text-tx-primary">{t('empty')}</h3>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-tx-muted">
          {t('emptyDescription')}
        </p>

        <Button
          onClick={onCreateAI}
          size="lg"
          className="mt-6 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-accent transition-all hover:opacity-90"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          {t('createAI')}
        </Button>
      </div>
    </div>
  );
}
