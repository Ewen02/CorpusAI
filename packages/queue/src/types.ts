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
}

export interface DocumentProgressEvent {
  documentId: string;
  status: 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  progress: number;
  step: 'PARSING' | 'CHUNKING' | 'EMBEDDING' | 'STORING' | null;
  errorMessage?: string;
}
