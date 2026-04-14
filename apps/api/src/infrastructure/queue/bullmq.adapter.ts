import { Inject, Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { DocumentProcessingJobData } from '@corpusai/queue';
import type { FailedJob, IDocumentQueue, QueueJobOptions } from './queue.port';

export const BULLMQ_DOCUMENT_QUEUE = 'BULLMQ_DOCUMENT_QUEUE';

@Injectable()
export class BullMQDocumentQueueAdapter implements IDocumentQueue {
  constructor(
    @Inject(BULLMQ_DOCUMENT_QUEUE)
    private readonly queue: Queue<DocumentProcessingJobData>
  ) {}

  async add(
    name: string,
    data: DocumentProcessingJobData,
    options?: QueueJobOptions
  ): Promise<void> {
    await this.queue.add(name, data, options);
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
