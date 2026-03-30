'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  DocumentUploader,
  Badge,
  Button,
  Skeleton,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DocumentIcon,
  TrashIcon,
  RefreshIcon,
  CheckIcon,
  LoaderIcon,
  XIcon,
  cn,
  type UploadedFile,
} from '@corpusai/ui';
import { DOCUMENT_STATUS_CONFIG } from '@/lib/constants';
import { formatFileSize } from '@/lib/utils';
import type { DocumentStatus } from '@corpusai/types';
import { STEP_ICONS, StepCompletedIcon, StepPendingIcon } from './document-processing-icons';

interface Document {
  id: string;
  filename: string;
  size: number;
  status: string;
  chunkCount?: number;
  wordCount?: number | null;
  pageCount?: number | null;
  errorMessage?: string | null;
}

interface DocumentsTabProps {
  documents: Document[] | undefined;
  documentCount: number;
  isLoading: boolean;
  uploadedFiles: UploadedFile[];
  subscriptionPlan?: string;
  onFilesSelected: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  onDeleteDocument: (documentId: string) => void;
  onRetryDocument: (documentId: string) => void;
}

const PROCESSING_STEP_KEYS = ['PARSING', 'CHUNKING', 'EMBEDDING', 'STORING'] as const;

// ============================================
// Main
// ============================================

const PLAN_MAX_FILE_SIZE: Record<string, number> = {
  FREE: 10 * 1024 * 1024,
  CREATOR: 50 * 1024 * 1024,
  PRO: 100 * 1024 * 1024,
  ENTERPRISE: 500 * 1024 * 1024,
};

export const DocumentsTab = React.memo(function DocumentsTab({
  documents,
  documentCount,
  isLoading,
  uploadedFiles,
  subscriptionPlan,
  onFilesSelected,
  onFileRemove,
  onDeleteDocument,
  onRetryDocument,
}: DocumentsTabProps) {
  const t = useTranslations('documents');
  const indexedCount = documents?.filter((d) => d.status === 'INDEXED').length ?? 0;
  const processingCount =
    documents?.filter((d) => d.status === 'PROCESSING' || d.status === 'PENDING').length ?? 0;
  const maxFileSize = PLAN_MAX_FILE_SIZE[subscriptionPlan ?? 'FREE'] ?? PLAN_MAX_FILE_SIZE.FREE;

  return (
    <div className="space-y-6">
      <DocumentUploader
        onFilesSelected={onFilesSelected}
        onFileRemove={onFileRemove}
        uploadedFiles={uploadedFiles}
        maxFileSize={maxFileSize}
      />

      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          {documentCount === 0
            ? t('noDocumentsInKnowledgeBase')
            : `${t('ready', { count: indexedCount })}${processingCount > 0 ? ` · ${t('processing', { count: processingCount })}` : ''}`}
        </p>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !documents || documents.length === 0 ? (
          <EmptyDocumentsState />
        ) : (
          <DocumentsList
            documents={documents}
            uploadedFiles={uploadedFiles}
            onDelete={onDeleteDocument}
            onRetry={onRetryDocument}
          />
        )}
      </div>
    </div>
  );
});

const EmptyDocumentsState = React.memo(function EmptyDocumentsState() {
  const t = useTranslations('documents');
  return (
    <div className="py-8 text-center text-muted-foreground">
      <DocumentIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
      <p>{t('empty')}</p>
      <p className="text-sm">{t('emptyDescription')}</p>
    </div>
  );
});

const DocumentsList = React.memo(function DocumentsList({
  documents,
  uploadedFiles,
  onDelete,
  onRetry,
}: {
  documents: Document[];
  uploadedFiles: UploadedFile[];
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentItem
          key={doc.id}
          document={doc}
          uploadInfo={uploadedFiles.find((f) => f.file.name === doc.filename)}
          onDelete={() => onDelete(doc.id)}
          onRetry={() => onRetry(doc.id)}
        />
      ))}
    </div>
  );
});

const DocumentItem = React.memo(function DocumentItem({
  document: doc,
  uploadInfo,
  onDelete,
  onRetry,
}: {
  document: Document;
  uploadInfo?: UploadedFile;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations('documents');
  const statusConfig = DOCUMENT_STATUS_CONFIG[doc.status as DocumentStatus];
  const isInProgress = doc.status === 'PROCESSING' || doc.status === 'PENDING';
  const isIndexed = doc.status === 'INDEXED';
  const isFailed = doc.status === 'FAILED';

  const currentStep = uploadInfo?.currentStep ?? null;
  const stepIndex = currentStep
    ? PROCESSING_STEP_KEYS.indexOf(currentStep as (typeof PROCESSING_STEP_KEYS)[number])
    : -1;

  // Progress by step: each completed step = 25%, current step = halfway
  const stepProgress = isInProgress
    ? stepIndex >= 0
      ? ((stepIndex + 0.5) / PROCESSING_STEP_KEYS.length) * 100
      : 5
    : 0;

  const STEP_LABEL_KEYS: Record<string, string> = {
    PARSING: 'stepLabels.parsing',
    CHUNKING: 'stepLabels.chunking',
    EMBEDDING: 'stepLabels.embedding',
    STORING: 'stepLabels.storing',
  };

  const STEP_SHORT_KEYS: Record<string, string> = {
    PARSING: 'stepShort.parsing',
    CHUNKING: 'stepShort.chunking',
    EMBEDDING: 'stepShort.embedding',
    STORING: 'stepShort.storing',
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 transition-all',
        isInProgress && 'animate-pulse-glow border-blue-500/30',
        isIndexed && 'animate-fade-in-up border-green-500/20',
        isFailed && 'border-red-500/20'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {/* Status-aware icon */}
          {isIndexed ? (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/15">
              <CheckIcon className="h-4 w-4 text-green-400" />
            </div>
          ) : isInProgress ? (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
              <LoaderIcon className="h-4 w-4 animate-spin text-blue-400" />
            </div>
          ) : isFailed ? (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15">
              <XIcon className="h-4 w-4 text-red-400" />
            </div>
          ) : (
            <DocumentIcon className="mt-0.5 h-8 w-8 shrink-0 text-muted-foreground" />
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{doc.filename}</p>

            {/* Size for all non-default states */}
            {(isIndexed || isInProgress || isFailed) && (
              <p className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</p>
            )}

            {/* Error message */}
            {isFailed && doc.errorMessage && (
              <p className="mt-1 truncate text-xs text-destructive">{doc.errorMessage}</p>
            )}

            {/* Success metadata */}
            {isIndexed && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-green-400/80">
                <span>{t('analysisComplete')}</span>
                {doc.pageCount != null && doc.pageCount > 0 && (
                  <>
                    <span>·</span>
                    <span>{t('pagesAnalyzed', { count: doc.pageCount })}</span>
                  </>
                )}
                {doc.wordCount != null && doc.wordCount > 0 && (
                  <>
                    <span>·</span>
                    <span>{t('wordsExtracted', { count: doc.wordCount.toLocaleString() })}</span>
                  </>
                )}
              </div>
            )}

            {/* Processing steps with SVG icons + progress bar */}
            {isInProgress && (
              <div className="mt-3 space-y-2">
                {/* Step icons row */}
                <div className="flex items-start justify-between">
                  {PROCESSING_STEP_KEYS.map((stepKey, i) => {
                    const isCompleted = stepIndex > i;
                    const isCurrent = stepIndex === i;
                    const renderIcon = STEP_ICONS[i] ?? StepPendingIcon;

                    return (
                      <div key={stepKey} className="flex flex-col items-center gap-1">
                        <div className="flex h-6 w-6 items-center justify-center">
                          {isCompleted ? (
                            <StepCompletedIcon />
                          ) : isCurrent ? (
                            renderIcon()
                          ) : (
                            <StepPendingIcon />
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-[10px] transition-colors duration-500',
                            isCurrent ? 'text-blue-400' : 'text-muted-foreground'
                          )}
                        >
                          {t(STEP_SHORT_KEYS[stepKey] as never)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar by step */}
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000 ease-out"
                    style={{ width: `${stepProgress}%` }}
                  />
                </div>

                {/* Step label */}
                <p className="text-xs text-blue-400/80">
                  {currentStep
                    ? (t(STEP_LABEL_KEYS[currentStep] as never) ?? t('processingFallback'))
                    : t('waiting')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Badge className={statusConfig.badgeClass}>{statusConfig.label}</Badge>
          {isFailed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRetry}>
                  <RefreshIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('retryAnalysis')}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('deleteDocument')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});
