'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../atoms/button';
import { Badge } from '../atoms/badge';
import { Skeleton } from '../atoms/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../molecules/card';

// ============================================
// Types
// ============================================

export type DocumentUploadStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'error';

export interface UploadedFile {
  id: string;
  file: File;
  status: DocumentUploadStatus;
  progress: number;
  error?: string;
}

export interface DocumentUploaderProps {
  onFilesSelected: (files: File[]) => void;
  onFileRemove?: (fileId: string) => void;
  uploadedFiles?: UploadedFile[];
  acceptedTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const DEFAULT_ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
];

const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_MAX_FILES = 10;

const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/csv': 'CSV',
};

const STATUS_COLORS: Record<DocumentUploadStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  uploading: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-yellow-500/20 text-yellow-400',
  success: 'bg-green-500/20 text-green-400',
  error: 'bg-destructive/20 text-destructive',
};

const STATUS_LABELS: Record<DocumentUploadStatus, string> = {
  pending: 'En attente',
  uploading: 'Upload...',
  processing: 'Traitement...',
  success: 'Indexé',
  error: 'Erreur',
};

// ============================================
// Helpers
// ============================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toUpperCase() || 'FILE';
}

// ============================================
// Sub-components
// ============================================

interface DropZoneProps {
  onDrop: (files: File[]) => void;
  acceptedTypes: string[];
  maxFileSize: number;
  maxFiles: number;
  disabled: boolean;
  currentFileCount: number;
}

function DropZone({
  onDrop,
  acceptedTypes,
  maxFileSize,
  maxFiles,
  disabled,
  currentFileCount,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const remainingSlots = maxFiles - currentFileCount;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && remainingSlots > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || remainingSlots <= 0) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = validateFiles(droppedFiles, acceptedTypes, maxFileSize, remainingSlots);
    if (validFiles.length > 0) {
      onDrop(validFiles);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = validateFiles(selectedFiles, acceptedTypes, maxFileSize, remainingSlots);
    if (validFiles.length > 0) {
      onDrop(validFiles);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && remainingSlots > 0) {
      inputRef.current?.click();
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragging && 'border-primary bg-primary/5',
        !isDragging && 'border-border hover:border-primary/50 hover:bg-muted/50',
        (disabled || remainingSlots <= 0) && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || remainingSlots <= 0}
      />

      <UploadIcon className="h-10 w-10 mx-auto text-muted-foreground mb-4" />

      <p className="text-sm font-medium text-foreground mb-1">
        Glissez vos fichiers ici
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        ou cliquez pour sélectionner
      </p>

      <div className="flex flex-wrap justify-center gap-1">
        {Object.values(FILE_TYPE_LABELS).map((label) => (
          <Badge key={label} variant="secondary" className="text-xs">
            {label}
          </Badge>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Max {formatFileSize(maxFileSize)} par fichier • {remainingSlots} fichier(s) restant(s)
      </p>
    </div>
  );
}

function validateFiles(
  files: File[],
  acceptedTypes: string[],
  maxFileSize: number,
  maxCount: number
): File[] {
  return files
    .filter((file) => acceptedTypes.includes(file.type))
    .filter((file) => file.size <= maxFileSize)
    .slice(0, maxCount);
}

interface FileListItemProps {
  uploadedFile: UploadedFile;
  onRemove?: (id: string) => void;
}

function FileListItem({ uploadedFile, onRemove }: FileListItemProps) {
  const { id, file, status, progress, error } = uploadedFile;

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="shrink-0">
        <FileIcon className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{getFileExtension(file.name)}</span>
          <span>•</span>
          <span>{formatFileSize(file.size)}</span>
          {error && (
            <>
              <span>•</span>
              <span className="text-destructive">{error}</span>
            </>
          )}
        </div>

        {(status === 'uploading' || status === 'processing') && (
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge className={cn('text-xs', STATUS_COLORS[status])}>
          {STATUS_LABELS[status]}
        </Badge>

        {onRemove && status !== 'uploading' && status !== 'processing' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onRemove(id)}
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Supprimer</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function DocumentUploader({
  onFilesSelected,
  onFileRemove,
  uploadedFiles = [],
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  disabled = false,
  className,
}: DocumentUploaderProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DropZone
          onDrop={onFilesSelected}
          acceptedTypes={acceptedTypes}
          maxFileSize={maxFileSize}
          maxFiles={maxFiles}
          disabled={disabled}
          currentFileCount={uploadedFiles.length}
        />

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <FileListItem
                key={file.id}
                uploadedFile={file}
                onRemove={onFileRemove}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Icons
// ============================================

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

// ============================================
// Skeleton Loader
// ============================================

export function DocumentUploaderSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
