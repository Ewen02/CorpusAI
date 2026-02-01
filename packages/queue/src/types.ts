export interface DocumentProcessingJobData {
  documentId: string;
  aiId: string;
  filename: string;
  mimeType: string;
  url?: string;
  content?: string;
  /** Base64-encoded file buffer */
  buffer?: string;
}

export interface DocumentProgressEvent {
  documentId: string;
  status: 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  progress: number;
  step: 'PARSING' | 'CHUNKING' | 'EMBEDDING' | 'STORING' | null;
  errorMessage?: string;
}
