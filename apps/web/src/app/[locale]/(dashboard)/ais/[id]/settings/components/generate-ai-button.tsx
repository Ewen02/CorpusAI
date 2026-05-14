'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@corpusai/ui';

interface GenerateAIButtonProps {
  isPending: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
}

export function GenerateAIButton({ isPending, canGenerate, onGenerate }: GenerateAIButtonProps) {
  const t = useTranslations('aiSettings.basicInfo');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onGenerate}
              disabled={!canGenerate || isPending}
              className="h-auto shrink-0 gap-1 px-1.5 py-0.5 text-[11px] text-tx-disabled hover:text-tx-primary disabled:pointer-events-none disabled:opacity-50"
            >
              {isPending ? <SpinnerIcon /> : <SparkleIcon />}
              {t('generateWithAI')}
            </Button>
          </span>
        </TooltipTrigger>
        {!canGenerate && <TooltipContent>{t('suggestionsUnavailableShort')}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-3 w-3 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function SparkleIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

export { SparkleIcon };
