'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { SparkleIcon } from './generate-ai-button';

interface SuggestionHintProps {
  suggestion: string | undefined;
  currentValue: string;
  charLimit: number;
}

export function SuggestionHint({ suggestion, currentValue, charLimit }: SuggestionHintProps) {
  const t = useTranslations('aiSettings.basicInfo');

  if (suggestion) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-tx-disabled">
        <SparkleIcon className="h-3 w-3 shrink-0 text-[hsl(var(--accent-500))]" />
        {currentValue.length > 0 && (
          <span className="truncate italic">{suggestion.slice(0, 60)}…</span>
        )}
        <kbd className="rounded border border-[hsl(var(--border-default))] px-1 font-mono text-[10px]">
          Tab
        </kbd>
        <span>{t('tabToAccept')}</span>
        <kbd className="rounded border border-[hsl(var(--border-default))] px-1 font-mono text-[10px]">
          Esc
        </kbd>
        <span>{t('escToIgnore')}</span>
      </p>
    );
  }

  return (
    <p className="text-[12px] text-tx-disabled">
      {currentValue.length}/{charLimit} {t('characters')}
    </p>
  );
}
