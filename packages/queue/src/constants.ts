export const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: 'document-processing',
  /** Dead-letter queue — jobs that exhausted all retries land here for manual inspection. */
  DOCUMENT_DLQ: 'document-processing-dlq',
} as const;

/**
 * Retention policy for completed and failed jobs.
 * - completed: keep 1k recent successes (debugging) but cap age at 7 days.
 * - failed: keep 10k failures, age-out at 30 days — the DLQ is the audit trail.
 */
export const JOB_RETENTION = {
  removeOnComplete: { age: 60 * 60 * 24 * 7, count: 1000 },
  removeOnFail: { age: 60 * 60 * 24 * 30, count: 10000 },
} as const;

export const JOB_RETRY_CONFIG = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  ...JOB_RETENTION,
};

export const REDIS_CHANNELS = {
  DOCUMENT_PROGRESS: 'doc-progress',
  DOCUMENT_FINAL_FAILURE: 'doc-final-failure',
} as const;

/**
 * Build the BullMQ jobId for a document processing job.
 *
 * BullMQ refuses to enqueue a second job with the same jobId while the first
 * is queued/active/delayed. We key by documentId so a duplicate enqueue
 * (double-click, retry handler racing the original) cannot trigger double
 * indexing.
 */
export function buildDocumentJobId(documentId: string): string {
  return `doc__${documentId}`;
}
