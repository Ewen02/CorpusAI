import { Queue } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { QUEUE_NAMES } from './constants';
import type { DocumentProcessingJobData } from './types';

export function createDocumentQueue(
  connection: RedisOptions | string
): Queue<DocumentProcessingJobData> {
  const redisOpts: RedisOptions =
    typeof connection === 'string'
      ? { host: new URL(connection).hostname, port: Number(new URL(connection).port) || 6379, maxRetriesPerRequest: null }
      : { ...connection, maxRetriesPerRequest: null };

  return new Queue<DocumentProcessingJobData>(QUEUE_NAMES.DOCUMENT_PROCESSING, {
    connection: redisOpts,
  });
}
