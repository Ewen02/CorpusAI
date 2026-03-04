import 'dotenv/config';
import { createWorker } from './worker';
import { disposeRagFactory } from './services/rag-factory';
import { disposeProgressService } from './services/progress.service';

const requiredEnvVars = ['REDIS_URL', 'DATABASE_URL', 'OPENAI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const redisUrl = process.env.REDIS_URL!;

console.log('Starting CorpusAI Document Worker...');

const worker = createWorker(redisUrl);

const shutdown = async () => {
  console.log('Shutting down worker...');
  await worker.close();
  await disposeRagFactory();
  await disposeProgressService();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('Worker ready, waiting for jobs');
