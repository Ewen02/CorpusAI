export const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: 'document-processing',
} as const;

export const JOB_RETRY_CONFIG = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
};

export const REDIS_CHANNELS = {
  DOCUMENT_PROGRESS: 'doc-progress',
} as const;
