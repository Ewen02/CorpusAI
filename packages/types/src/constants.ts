/**
 * Constants shared between backend and frontend.
 */

/**
 * Supported document MIME types for upload.
 */
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
] as const;

export type SupportedDocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number];

/**
 * Default score threshold for RAG source relevance.
 * Sources below this score are excluded from context.
 */
export const DEFAULT_SCORE_THRESHOLD = 0.6;
