'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@corpusai/ui';

import { INPUT_CLASS } from '../constants';

interface DangerTabProps {
  aiId: string;
  aiName: string;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (v: boolean) => void;
  deleteConfirmText: string;
  setDeleteConfirmText: (v: string) => void;
  isDeletePending: boolean;
  onDelete: () => Promise<void>;
}

export function DangerTab({
  aiId,
  aiName,
  showDeleteConfirm,
  setShowDeleteConfirm,
  deleteConfirmText,
  setDeleteConfirmText,
  isDeletePending,
  onDelete,
}: DangerTabProps) {
  const t = useTranslations('aiSettings');
  const td = useTranslations('docs');

  const handleExport = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ais/${aiId}/documents/export`,
      { credentials: 'include' }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corpus-export-${aiId}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Export Corpus */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-tx-primary">{td('exportCorpus')}</p>
            <p className="mt-0.5 text-[13px] text-tx-muted">{td('exportCorpusDesc')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            {td('exportCorpus')}
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-[hsl(var(--danger)/0.2)] bg-[hsl(var(--danger)/0.04)] p-5">
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-[hsl(var(--danger))]">
            {t('dangerZone.title')}
          </p>
          <p className="mt-0.5 text-[13px] text-tx-muted">{t('dangerZone.description')}</p>
        </div>

        <div className="rounded-lg border border-[hsl(var(--danger)/0.3)] bg-[hsl(var(--danger)/0.06)] p-4">
          <h4 className="mb-2 text-[13px] font-semibold text-[hsl(var(--danger))]">
            {t('dangerZone.deleteTitle')}
          </h4>
          <p className="mb-4 text-[13px] text-tx-muted">{t('dangerZone.deleteDescription')}</p>

          {!showDeleteConfirm ? (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              {t('dangerZone.deleteButton')}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-tx-secondary">
                {t('dangerZone.confirmPrompt')}{' '}
                <strong className="text-tx-primary">{aiName}</strong>{' '}
                {t('dangerZone.confirmPromptSuffix')}
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={aiName}
                className={INPUT_CLASS}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  disabled={deleteConfirmText !== aiName || isDeletePending}
                >
                  {isDeletePending ? t('dangerZone.deleting') : t('dangerZone.confirmDelete')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                >
                  {t('dangerZone.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
