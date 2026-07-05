import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { DocumentProcessingJobData } from '@corpusai/queue';
import type { FailedJob, IDocumentQueue, QueueJobOptions } from './queue.port';

export const BULLMQ_DOCUMENT_QUEUE = 'BULLMQ_DOCUMENT_QUEUE';

/**
 * Guard against a hung enqueue: if Redis is unreachable, BullMQ's connection
 * (configured with maxRetriesPerRequest: null) would keep retrying forever and
 * leave the HTTP handler pending until the client gives up (~300s / HTTP 499).
 * Cap every enqueue so it fails fast with a clear 503 instead.
 */
const ENQUEUE_TIMEOUT_MS = 8_000;

@Injectable()
export class BullMQDocumentQueueAdapter implements IDocumentQueue {
  private readonly logger = new Logger(BullMQDocumentQueueAdapter.name);

  constructor(
    @Inject(BULLMQ_DOCUMENT_QUEUE)
    private readonly queue: Queue<DocumentProcessingJobData>
  ) {}

  async add(
    name: string,
    data: DocumentProcessingJobData,
    options?: QueueJobOptions
  ): Promise<void> {
    try {
      await this.withTimeout(this.queue.add(name, data, options), ENQUEUE_TIMEOUT_MS);
    } catch (error) {
      this.logger.error(`Failed to enqueue document job "${name}": ${error}`);
      throw new ServiceUnavailableException(
        'Document processing queue is temporarily unavailable. Please try again.'
      );
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Queue operation timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
  }

  async getFailedJobs(skip: number, end: number): Promise<FailedJob[]> {
    const jobs = await this.queue.getFailed(skip, end);
    return jobs.map((job) => ({
      jobId: job.id ?? '',
      data: job.data,
      failedReason: job.failedReason ?? null,
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn ?? null,
      timestamp: job.timestamp,
    }));
  }

  async getFailedCount(): Promise<number> {
    return this.queue.getFailedCount();
  }

  async retryJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;
    await job.retry();
    return true;
  }

  async removeJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;
    await job.remove();
    return true;
  }
}
