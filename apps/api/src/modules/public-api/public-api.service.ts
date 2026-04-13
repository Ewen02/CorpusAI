import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { RagService } from '../rag';
import { PublicApiRepository } from './public-api.repository';

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

@Injectable()
export class PublicApiService {
  private readonly logger = new Logger(PublicApiService.name);

  constructor(
    private ragService: RagService,
    private readonly repo: PublicApiRepository
  ) {}

  // ── API Key Management ──

  async createApiKey(userId: string, name: string) {
    const raw = randomBytes(24).toString('hex');
    const key = `cai_${raw}`;
    const prefix = key.slice(0, 12);
    const keyHash = hashKey(key);

    await this.repo.createApiKey(userId, name, keyHash, prefix);

    return { key, prefix, name };
  }

  async listApiKeys(userId: string) {
    return this.repo.listApiKeys(userId);
  }

  async deleteApiKey(userId: string, keyId: string) {
    const key = await this.repo.findApiKey(keyId, userId);

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    await this.repo.deleteApiKey(keyId);
  }

  // ── Public Query Endpoint ──

  async query(userId: string, slug: string, question: string) {
    const ai = await this.repo.findAIBySlugAndUser(slug, userId);

    if (!ai) {
      throw new NotFoundException(`AI "${slug}" not found or not active`);
    }

    const result = await this.ragService.query(ai.id, question);

    this.logger.log(`API query for AI ${ai.slug}: "${question.slice(0, 50)}..."`);

    return {
      answer: result.answer,
      sources: result.sources.map((s) => ({
        chunkId: s.chunkId,
        documentSource: s.documentSource,
        score: s.score,
        text: s.text,
      })),
      metrics: result.metrics,
    };
  }

  async listUserAIs(userId: string) {
    return this.repo.listUserAIs(userId);
  }
}
