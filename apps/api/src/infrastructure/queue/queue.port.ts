import type { DocumentProcessingJobData } from '@corpusai/queue';

export const DOCUMENT_QUEUE_PORT = Symbol('DOCUMENT_QUEUE_PORT');

export interface QueueJobOptions {
  attempts?: number;
  backoff?: { type: string; delay: number };
}

export interface FailedJob {
  jobId: string;
  data: DocumentProcessingJobData;
  failedReason: string | null;
  attemptsMade: number;
  finishedOn: number | null;
  timestamp: number;
}

export interface IDocumentQueue {
  add(name: string, data: DocumentProcessingJobData, options?: QueueJobOptions): Promise<void>;

  getFailedJobs(skip: number, end: number): Promise<FailedJob[]>;

  getFailedCount(): Promise<number>;

  retryJob(jobId: string): Promise<boolean>;

  removeJob(jobId: string): Promise<boolean>;
}
