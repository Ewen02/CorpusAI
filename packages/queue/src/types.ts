import type { DocumentStatus, ProcessingStep } from '@corpusai/types';

export interface DocumentProcessingJobData {
  documentId: string;
  aiId: string;
  filename: string;
  mimeType: string;
  url?: string;
  content?: string;
  /** Base64-encoded file buffer (legacy, avoid for large files) */
  buffer?: string;
  /** Path to temp file on shared disk (preferred over buffer) */
  filePath?: string;
  /**
   * Document version this processing run belongs to. When set, the worker
   * tags every chunk it persists with this id so rollbacks can re-upsert
   * past chunks without re-embedding.
   */
  documentVersionId?: string;
}

export interface DocumentFinalFailureEvent {
  documentId: string;
  aiId: string;
  filename: string;
  errorMessage: string;
  attemptsMade: number;
  failedAt: string;
}

export interface DocumentProgressEvent {
  documentId: string;
  status: DocumentStatus;
  progress: number;
  step: ProcessingStep | null;
  errorMessage?: string;
}
