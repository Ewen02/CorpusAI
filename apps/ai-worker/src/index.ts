import 'dotenv/config';
import { logger } from './lib/logger';
import { createWorker } from './worker';
import { disposeRagFactory } from './services/rag-factory';
import { disposeProgressService } from './services/progress.service';

const requiredEnvVars = ['REDIS_URL', 'DATABASE_URL', 'OPENAI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.fatal({ envVar }, 'Missing required environment variable');
    process.exit(1);
  }
}

const redisUrl = process.env.REDIS_URL!;

logger.info('Starting CorpusAI Document Worker...');

const worker = createWorker(redisUrl);

const shutdown = async () => {
  logger.info('Shutting down worker...');
  await worker.close();
  await disposeRagFactory();
  await disposeProgressService();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info('Worker ready, waiting for jobs');
