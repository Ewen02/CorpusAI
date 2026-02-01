'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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

/**
 * Documents tab content for the AI detail page.
 * Displays document uploader and indexed documents list.
 */
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DocumentUploader
        onFilesSelected={onFilesSelected}
        onFileRemove={onFileRemove}
        uploadedFiles={uploadedFiles}
      />

      <Card>
        <CardHeader>
          <CardTitle>Documents indexes</CardTitle>
          <CardDescription>
            {documentCount} document(s) dans la base de connaissances
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              onDelete={onDeleteDocument}
              onRetry={onRetryDocument}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
});

/**
 * Empty state for documents list.
 */
const EmptyDocumentsState = React.memo(function EmptyDocumentsState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <DocumentIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Aucun document indexe</p>
      <p className="text-sm">
        Ajoutez des documents pour enrichir votre assistant.
      </p>
    </div>
  );
});

/**
 * Documents list component.
 */
const DocumentsList = React.memo(function DocumentsList({
  documents,
  onDelete,
  onRetry,
}: {
  documents: Document[];
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentItem
          key={doc.id}
          document={doc}
          onDelete={() => onDelete(doc.id)}
          onRetry={() => onRetry(doc.id)}
        />
      ))}
    </div>
  );
});

/**
 * Single document item.
 */
const DocumentItem = React.memo(function DocumentItem({
  document: doc,
  onDelete,
  onRetry,
}: {
  document: Document;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const statusConfig = DOCUMENT_STATUS_CONFIG[doc.status as DocumentStatus];

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <DocumentIcon className="h-8 w-8 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{doc.filename}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(doc.size)}</span>
            {doc.chunkCount !== undefined && (
              <>
                <span>•</span>
                <span>{doc.chunkCount} chunks</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge className={statusConfig.badgeClass}>{statusConfig.label}</Badge>
        {doc.status === 'FAILED' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRetry}
              >
                <RefreshIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reessayer l&apos;indexation</TooltipContent>
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
  );
});
