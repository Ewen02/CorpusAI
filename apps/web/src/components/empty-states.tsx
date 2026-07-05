'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@corpusai/ui';
import { BotIcon, PlusIcon } from '@/lib/icons';

interface EmptyAIStateProps {
  onCreateAI: () => void;
  /** `compact` for the dashboard preview, `full` for the standalone AIs page. */
  size?: 'compact' | 'full';
}

/**
 * Empty state shown when the creator has no AIs yet.
 * `compact` is the small card on the dashboard; `full` is the larger hero
 * variant on the AIs list page.
 */
export function EmptyAIState({ onCreateAI, size = 'compact' }: EmptyAIStateProps) {
  const t = useTranslations('ai.list');
  const isFull = size === 'full';

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-dashed border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-center ${
        isFull ? 'py-16' : 'py-10'
      }`}
    >
      {isFull && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--accent-500)/0.06),transparent)]" />
      )}

      <div className="relative flex flex-col items-center">
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 ring-1 ring-[hsl(var(--accent-500)/0.2)] ${
            isFull ? 'h-14 w-14' : 'h-10 w-10 rounded-lg'
          }`}
        >
          <BotIcon className={isFull ? 'h-7 w-7 text-indigo-400' : 'h-5 w-5 text-indigo-400'} />
        </div>

        <h3 className={`font-semibold text-tx-primary ${isFull ? 'mt-5 text-lg' : 'mt-4 text-sm'}`}>
          {t('empty')}
        </h3>
        <p
          className={`text-tx-muted ${
            isFull ? 'mt-2 max-w-sm text-[13px] leading-relaxed' : 'mt-1 text-[13px]'
          }`}
        >
          {t('emptyDescription')}
        </p>

        <Button
          onClick={onCreateAI}
          size={isFull ? 'lg' : 'sm'}
          className={`bg-primary shadow-accent transition-all hover:opacity-90 ${
            isFull ? 'mt-6' : 'mt-4'
          }`}
        >
          <PlusIcon className={isFull ? 'mr-2 h-4 w-4' : 'mr-2 h-3.5 w-3.5'} />
          {t('createAI')}
        </Button>
      </div>
    </div>
  );
}

interface EmptyAIStateFullProps {
  onCreateAI: () => void;
}

/** Standalone AIs-page variant — thin wrapper over `EmptyAIState` with `size="full"`. */
export function EmptyAIStateFull({ onCreateAI }: EmptyAIStateFullProps) {
  return <EmptyAIState onCreateAI={onCreateAI} size="full" />;
}
