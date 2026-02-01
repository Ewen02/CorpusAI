import { Worker } from "bullmq";
import { QUEUE_NAMES, type DocumentProcessingJobData } from "@corpusai/queue";
import { processDocument } from "./processors/document-processor";

export function createWorker(redisUrl: string): Worker<DocumentProcessingJobData> {
  const url = new URL(redisUrl);

  const worker = new Worker<DocumentProcessingJobData>(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    async (job) => {
      console.log(`[Job ${job.id}] Processing document ${job.data.documentId} (attempt ${job.attemptsMade + 1})`);
      await processDocument(job.data);
      console.log(`[Job ${job.id}] Completed document ${job.data.documentId}`);
    },
    {
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: url.password || undefined,
        maxRetriesPerRequest: null,
      },
      concurrency: 3,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Job ${job?.id}] Failed document ${job?.data.documentId}: ${err.message}`);
  });

  worker.on("error", (err) => {
    console.error(`Worker error: ${err.message}`);
  });

  return worker;
}
