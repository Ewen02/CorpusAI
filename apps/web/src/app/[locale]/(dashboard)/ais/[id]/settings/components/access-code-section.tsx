'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, CopyButton, Input } from '@corpusai/ui';
import { Check, Trash2 } from 'lucide-react';

import { CARD_CLASS, INPUT_CLASS } from '../constants';

interface AccessCodeSectionProps {
  hasAccessCode: boolean;
  accessCode: string;
  setAccessCode: (v: string) => void;
  savedCodeValue: string | null;
  codeSaved: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: () => void;
  onDelete: () => void;
}

export function AccessCodeSection({
  hasAccessCode,
  accessCode,
  setAccessCode,
  savedCodeValue,
  codeSaved,
  isSaving,
  isDeleting,
  onSave,
  onDelete,
}: AccessCodeSectionProps) {
  const t = useTranslations('aiSettings.accessTab');

  return (
    <div className={CARD_CLASS}>
      <div className="mb-4">
        <p className="text-[15px] font-semibold text-tx-primary">{t('accessCodeTitle')}</p>
        <p className="mt-0.5 text-[13px] text-tx-muted">{t('accessCodeDescription')}</p>
      </div>
      {hasAccessCode && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-[hsl(var(--success)/0.08)] px-3 py-2">
          <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
          <p className="text-[12px] text-[hsl(var(--success))]">{t('codeActive')}</p>
        </div>
      )}
      {savedCodeValue && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-[hsl(var(--surface-2))] px-3 py-2">
          <span className="flex-1 font-mono text-sm text-tx-primary">{savedCodeValue}</span>
          <CopyButton value={savedCodeValue} />
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <label className="text-[13px] font-medium text-tx-secondary">
            {hasAccessCode ? t('newCodeReplace') : t('newCode')}
          </label>
          <Input
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder={t('codePlaceholder')}
            minLength={4}
            className={INPUT_CLASS}
          />
        </div>
        <Button size="sm" onClick={onSave} disabled={accessCode.length < 4 || isSaving}>
          {codeSaved ? t('codeSaved') : t('codeSave')}
        </Button>
      </div>
      {hasAccessCode && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t('deleteCurrentCode')}
        </Button>
      )}
    </div>
  );
}
