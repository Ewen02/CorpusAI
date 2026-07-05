export const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: 'document-processing',
} as const;

/**
 * Retention policy for completed and failed jobs.
 * - completed: keep 1k recent successes (debugging) but cap age at 7 days.
 * - failed: keep 10k failures, age-out at 30 days — the retained failed set
 *   is the audit trail admins inspect/retry via the admin/failed-jobs endpoint.
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

/**
 * Build a STABLE BullMQ jobId for a document retry.
 *
 * Unlike a `Date.now()`-suffixed id, this is deterministic: the same
 * (documentId, versionId) pair always yields the same jobId, so a re-queue
 * racing an in-flight retry is deduplicated by BullMQ instead of spawning a
 * second indexing run. When no version is known, an optional `attempt` number
 * still lets the caller distinguish intentional re-runs without racing.
 */
export function buildRetryJobId(documentId: string, versionId?: string, attempt?: number): string {
  const base = buildDocumentJobId(documentId);
  const key = versionId ?? (attempt !== undefined ? `attempt${attempt}` : 'retry');
  return `${base}__retry__${key}`;
}
