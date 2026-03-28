import { Worker } from 'bullmq';
import { QUEUE_NAMES, type DocumentProcessingJobData } from '@corpusai/queue';
import { logger } from './lib/logger';
import { Sentry } from './lib/sentry';
import { processDocument } from './processors/document-processor';
import { getProgressService } from './services/progress.service';

export function createWorker(redisUrl: string): Worker<DocumentProcessingJobData> {
  const url = new URL(redisUrl);

  const worker = new Worker<DocumentProcessingJobData>(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    async (job) => {
      logger.info(
        { jobId: job.id, documentId: job.data.documentId, attempt: job.attemptsMade + 1 },
        'Processing document'
      );
      await processDocument(job.data);
      logger.info({ jobId: job.id, documentId: job.data.documentId }, 'Completed document');
    },
    {
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: url.password || undefined,
        maxRetriesPerRequest: null,
        ...(url.protocol === 'rediss:' ? { tls: { rejectUnauthorized: true } } : {}),
      },
      concurrency: 3,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, documentId: job?.data.documentId, err },
      'Failed document processing'
    );
    // Capture and notify only after all retries are exhausted
    const maxAttempts = job?.opts?.attempts ?? 3;
    if (job && job.attemptsMade >= maxAttempts) {
      Sentry.withScope((scope) => {
        scope.setTag('jobId', job.id ?? 'unknown');
        scope.setContext('job', {
          documentId: job.data.documentId,
          aiId: job.data.aiId,
          filename: job.data.filename,
          attempts: job.attemptsMade,
        });
        Sentry.captureException(err);
      });

      // Notify the API to send failure email to document owner
      getProgressService()
        .publishFinalFailure({
          documentId: job.data.documentId,
          aiId: job.data.aiId,
          filename: job.data.filename,
          errorMessage: err.message,
          attemptsMade: job.attemptsMade,
          failedAt: new Date().toISOString(),
        })
        .catch(() => {});
    }
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker error');
  });

  return worker;
}
