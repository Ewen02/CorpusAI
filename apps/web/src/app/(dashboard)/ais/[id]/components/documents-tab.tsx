'use client';

import * as React from 'react';
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
  onFilesSelected: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  onDeleteDocument: (documentId: string) => void;
  onRetryDocument: (documentId: string) => void;
}

const PROCESSING_STEPS = [
  { key: 'PARSING', label: 'Lecture' },
  { key: 'CHUNKING', label: 'Analyse' },
  { key: 'EMBEDDING', label: 'Compréhension' },
  { key: 'STORING', label: 'Enregistrement' },
] as const;

const STEP_LABELS: Record<string, string> = {
  PARSING: 'Lecture du document…',
  CHUNKING: 'Découpage en sections…',
  EMBEDDING: 'Compréhension du contenu…',
  STORING: 'Enregistrement…',
};

// ============================================
// Step SVG Animations (24x24)
// ============================================

function ParsingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="2"
        width="16"
        height="20"
        rx="2"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1.2"
        opacity="0.5"
      />
      <line
        x1="7"
        y1="7"
        x2="17"
        y2="7"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1.2"
        opacity="0.3"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="11"
        x2="15"
        y2="11"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1.2"
        opacity="0.3"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="15"
        x2="17"
        y2="15"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1.2"
        opacity="0.3"
        strokeLinecap="round"
      />
      <line
        x1="5"
        y1="4"
        x2="19"
        y2="4"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ animation: 'scanLine 1.8s ease-in-out infinite' }}
      />
    </svg>
  );
}

function ChunkingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect
        x="5"
        y="2"
        width="14"
        height="5"
        rx="1.5"
        fill="hsl(217 80% 60% / 0.2)"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1"
        style={{ animation: 'chunkBounce1 1.4s ease-in-out infinite' }}
      />
      <rect
        x="5"
        y="9"
        width="14"
        height="5"
        rx="1.5"
        fill="hsl(217 80% 60% / 0.15)"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1"
        style={{ animation: 'chunkBounce2 1.4s ease-in-out infinite' }}
      />
      <rect
        x="5"
        y="16"
        width="14"
        height="5"
        rx="1.5"
        fill="hsl(217 80% 60% / 0.1)"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1"
        style={{ animation: 'chunkBounce3 1.4s ease-in-out infinite' }}
      />
    </svg>
  );
}

function EmbeddingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <line
        x1="12"
        y1="4"
        x2="5"
        y2="12"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'neuronLine 1.4s ease-in-out infinite' }}
      />
      <line
        x1="12"
        y1="4"
        x2="19"
        y2="12"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'neuronLine 1.4s ease-in-out infinite', animationDelay: '0.2s' }}
      />
      <line
        x1="5"
        y1="12"
        x2="19"
        y2="12"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'neuronLine 1.4s ease-in-out infinite', animationDelay: '0.4s' }}
      />
      <line
        x1="5"
        y1="12"
        x2="9"
        y2="20"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'neuronLine 1.4s ease-in-out infinite', animationDelay: '0.3s' }}
      />
      <line
        x1="19"
        y1="12"
        x2="15"
        y2="20"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'neuronLine 1.4s ease-in-out infinite', animationDelay: '0.5s' }}
      />
      <circle
        cx="12"
        cy="4"
        r="2.5"
        fill="hsl(217 80% 60%)"
        style={{ animation: 'neuronPulse 1.4s ease-in-out infinite', transformOrigin: '12px 4px' }}
      />
      <circle
        cx="5"
        cy="12"
        r="2"
        fill="hsl(217 80% 60%)"
        style={{
          animation: 'neuronPulse 1.4s ease-in-out infinite',
          animationDelay: '0.3s',
          transformOrigin: '5px 12px',
        }}
      />
      <circle
        cx="19"
        cy="12"
        r="2"
        fill="hsl(217 80% 60%)"
        style={{
          animation: 'neuronPulse 1.4s ease-in-out infinite',
          animationDelay: '0.5s',
          transformOrigin: '19px 12px',
        }}
      />
      <circle
        cx="9"
        cy="20"
        r="2"
        fill="hsl(217 80% 60%)"
        style={{
          animation: 'neuronPulse 1.4s ease-in-out infinite',
          animationDelay: '0.7s',
          transformOrigin: '9px 20px',
        }}
      />
      <circle
        cx="15"
        cy="20"
        r="2"
        fill="hsl(217 80% 60%)"
        style={{
          animation: 'neuronPulse 1.4s ease-in-out infinite',
          animationDelay: '0.9s',
          transformOrigin: '15px 20px',
        }}
      />
    </svg>
  );
}

function StoringIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <ellipse
        cx="12"
        cy="18"
        rx="8"
        ry="2.5"
        fill="hsl(217 80% 60%)"
        fillOpacity="0.2"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'dbPulse 2s ease-in-out infinite' }}
      />
      <rect x="4" y="13" width="16" height="5" fill="hsl(217 80% 60% / 0.08)" stroke="none" />
      <ellipse
        cx="12"
        cy="13"
        rx="8"
        ry="2.5"
        fill="hsl(217 80% 60%)"
        fillOpacity="0.15"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
      />
      <line x1="4" y1="13" x2="4" y2="18" stroke="hsl(217 80% 65%)" strokeWidth="1.2" />
      <line x1="20" y1="13" x2="20" y2="18" stroke="hsl(217 80% 65%)" strokeWidth="1.2" />
      <g style={{ animation: 'dropIn 1.8s ease-in-out infinite' }}>
        <rect
          x="9"
          y="2"
          width="6"
          height="7"
          rx="1"
          fill="hsl(217 80% 60% / 0.3)"
          stroke="hsl(217 80% 65%)"
          strokeWidth="1"
        />
        <line
          x1="10.5"
          y1="4"
          x2="13.5"
          y2="4"
          stroke="hsl(217 80% 70%)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        <line
          x1="10.5"
          y1="6"
          x2="12.5"
          y2="6"
          stroke="hsl(217 80% 70%)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

const STEP_ICONS: Array<() => React.JSX.Element> = [
  ParsingIcon,
  ChunkingIcon,
  EmbeddingIcon,
  StoringIcon,
];

function StepCompletedIcon() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
      <CheckIcon className="h-3 w-3 text-green-400" />
    </div>
  );
}

function StepPendingIcon() {
  return <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />;
}

// ============================================
// Main
// ============================================

export const DocumentsTab = React.memo(function DocumentsTab({
  documents,
  documentCount,
  isLoading,
  uploadedFiles,
  onFilesSelected,
  onFileRemove,
  onDeleteDocument,
  onRetryDocument,
}: DocumentsTabProps) {
  const indexedCount = documents?.filter((d) => d.status === 'INDEXED').length ?? 0;
  const processingCount =
    documents?.filter((d) => d.status === 'PROCESSING' || d.status === 'PENDING').length ?? 0;

  return (
    <div className="space-y-6">
      <DocumentUploader
        onFilesSelected={onFilesSelected}
        onFileRemove={onFileRemove}
        uploadedFiles={uploadedFiles}
      />

      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          {documentCount === 0
            ? 'Aucun document dans la base de connaissances'
            : `${indexedCount} document(s) prêt(s)${processingCount > 0 ? ` · ${processingCount} en traitement` : ''}`}
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
  return (
    <div className="py-8 text-center text-muted-foreground">
      <DocumentIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
      <p>Aucun document ajouté</p>
      <p className="text-sm">Importez vos fichiers pour que votre assistant puisse y répondre.</p>
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
  const statusConfig = DOCUMENT_STATUS_CONFIG[doc.status as DocumentStatus];
  const isInProgress = doc.status === 'PROCESSING' || doc.status === 'PENDING';
  const isIndexed = doc.status === 'INDEXED';
  const isFailed = doc.status === 'FAILED';

  const currentStep = uploadInfo?.currentStep ?? null;
  const stepIndex = currentStep ? PROCESSING_STEPS.findIndex((s) => s.key === currentStep) : -1;

  // Progress by step: each completed step = 25%, current step = halfway
  const stepProgress = isInProgress
    ? stepIndex >= 0
      ? ((stepIndex + 0.5) / PROCESSING_STEPS.length) * 100
      : 5
    : 0;

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
                <span>Analyse terminée</span>
                {doc.pageCount != null && doc.pageCount > 0 && (
                  <>
                    <span>·</span>
                    <span>
                      {doc.pageCount} {doc.pageCount === 1 ? 'page analysée' : 'pages analysées'}
                    </span>
                  </>
                )}
                {doc.wordCount != null && doc.wordCount > 0 && (
                  <>
                    <span>·</span>
                    <span>{doc.wordCount.toLocaleString()} mots extraits</span>
                  </>
                )}
              </div>
            )}

            {/* Processing steps with SVG icons + progress bar */}
            {isInProgress && (
              <div className="mt-3 space-y-2">
                {/* Step icons row */}
                <div className="flex items-start justify-between">
                  {PROCESSING_STEPS.map((step, i) => {
                    const isCompleted = stepIndex > i;
                    const isCurrent = stepIndex === i;
                    const renderIcon = STEP_ICONS[i] ?? StepPendingIcon;

                    return (
                      <div key={step.key} className="flex flex-col items-center gap-1">
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
                          {step.label}
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
                  {currentStep ? (STEP_LABELS[currentStep] ?? 'Traitement…') : 'En attente…'}
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
              <TooltipContent>Réessayer l&apos;analyse</TooltipContent>
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
            <TooltipContent>Supprimer le document</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});
