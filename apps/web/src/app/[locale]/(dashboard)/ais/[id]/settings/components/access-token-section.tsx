'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@corpusai/ui';
import { Link2, Lock, RefreshCw, Trash2 } from 'lucide-react';

import { CARD_CLASS } from '../constants';

interface AccessTokenSectionProps {
  hasAccessToken: boolean;
  generatedToken: { token: string; url: string } | null;
  copied: boolean;
  isGenerating: boolean;
  isDeleting: boolean;
  onGenerate: () => void;
  onDelete: () => void;
  onCopy: (url: string) => void;
}

export function AccessTokenSection({
  hasAccessToken,
  generatedToken,
  copied,
  isGenerating,
  isDeleting,
  onGenerate,
  onDelete,
  onCopy,
}: AccessTokenSectionProps) {
  const t = useTranslations('aiSettings.accessTab');

  return (
    <div className={CARD_CLASS}>
      <div className="mb-4">
        <p className="text-[15px] font-semibold text-tx-primary">{t('secretLink')}</p>
        <p className="mt-0.5 text-[13px] text-tx-muted">{t('secretLinkDescription')}</p>
      </div>
      {generatedToken ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={generatedToken.url}
              aria-label={t('secretLink')}
              className="h-9 flex-1 rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-3 text-[12px] text-tx-muted"
            />
            <Button size="sm" variant="outline" onClick={() => onCopy(generatedToken.url)}>
              {copied ? t('copied') : t('copy')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onGenerate} disabled={isGenerating}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {t('regenerate')}
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={isDeleting}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t('delete')}
            </Button>
          </div>
        </div>
      ) : hasAccessToken ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-3 py-2">
            <Lock className="h-4 w-4 text-[hsl(var(--success))]" />
            <p className="flex-1 text-[13px] text-tx-muted">{t('secretLinkActive')}</p>
            <span className="text-[11px] text-[hsl(var(--success))]">{t('active')}</span>
          </div>
          <p className="text-[12px] text-tx-muted">{t('regenerateHint')}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onGenerate} disabled={isGenerating}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {t('regenerate')}
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={isDeleting}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t('delete')}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={onGenerate} disabled={isGenerating}>
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          {isGenerating ? t('generating') : t('generateSecretLink')}
        </Button>
      )}
    </div>
  );
}
