'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@corpusai/ui';
import { FileText, Trash2, Upload } from 'lucide-react';

export interface PendingFile {
  id: string;
  file: File;
}

interface StepDocumentsProps {
  pendingFiles: PendingFile[];
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (id: string) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

const MAX_FILE_SIZE_MB = 100;
const MAX_PENDING_FILES = 20;
const ACCEPT = '.pdf,.txt,.md,.docx';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function StepDocuments({
  pendingFiles,
  onFilesAdded,
  onFileRemoved,
  onNext,
  onSkip,
  onBack,
}: StepDocumentsProps) {
  const t = useTranslations('aiNewWizard');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleAdd = React.useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files);
      const remainingSlots = MAX_PENDING_FILES - pendingFiles.length;
      if (remainingSlots <= 0) {
        setError(t('documents.errorMax', { max: MAX_PENDING_FILES }));
        return;
      }
      const accepted: File[] = [];
      for (const file of incoming.slice(0, remainingSlots)) {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          setError(t('documents.errorTooLarge', { name: file.name, max: MAX_FILE_SIZE_MB }));
          continue;
        }
        accepted.push(file);
      }
      if (accepted.length > 0) {
        setError(null);
        onFilesAdded(accepted);
      }
    },
    [pendingFiles.length, onFilesAdded, t]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleAdd(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <section className="glass surface-stat rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-6">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-tx-primary">{t('documents.heading')}</h2>
            <p className="mt-0.5 text-[13px] text-tx-muted">{t('documents.subheading')}</p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-3 py-1.5 text-[12.5px] font-medium text-tx-secondary transition-colors hover:border-[hsl(var(--accent-500)/0.4)] hover:text-[hsl(var(--accent-500))]"
          >
            {t('documents.skip')}
          </button>
        </header>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
            isDragging
              ? 'border-[hsl(var(--accent-500)/0.5)] bg-[hsl(var(--accent-500)/0.05)]'
              : 'border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] hover:border-[hsl(var(--border-strong))]'
          }`}
          role="button"
          tabIndex={0}
        >
          <Upload className="h-6 w-6 text-tx-muted" />
          <p className="text-[14px] font-medium text-tx-primary">{t('documents.dropzoneTitle')}</p>
          <p className="text-[12.5px] text-tx-muted">{t('documents.dropzoneHint')}</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleAdd(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {error && (
          <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
            {error}
          </p>
        )}

        {pendingFiles.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {pendingFiles.map(({ id, file }) => (
              <li
                key={id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-tx-muted" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-tx-primary">{file.name}</p>
                    <p className="text-[11.5px] text-tx-disabled">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={t('documents.remove')}
                  onClick={() => onFileRemoved(id)}
                  className="rounded-md p-1.5 text-tx-muted transition-colors hover:bg-[hsl(var(--surface-1))] hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[12px] text-tx-disabled">{t('documents.deferredNote')}</p>
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          {t('actions.back')}
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
            {t('documents.skipInline')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onNext}
            className="bg-primary shadow-[0_2px_8px_hsl(var(--accent-500)/0.35)] hover:opacity-90"
          >
            {t('actions.next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
