import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@corpusai/database';
import { RagService } from '../rag/rag.service';

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

@Injectable()
export class PublicApiService {
  private readonly logger = new Logger(PublicApiService.name);

  constructor(private ragService: RagService) {}

  // ── API Key Management ──

  async createApiKey(userId: string, name: string) {
    // Generate key: cai_ + 48 random hex chars
    const raw = randomBytes(24).toString('hex');
    const key = `cai_${raw}`;
    const prefix = key.slice(0, 12);
    const keyHash = hashKey(key);

    await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        prefix,
      },
    });

    // Return the raw key only once — it cannot be retrieved later
    return { key, prefix, name };
  }

  async listApiKeys(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteApiKey(userId: string, keyId: string) {
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    await prisma.apiKey.delete({ where: { id: keyId } });
  }

  // ── Public Query Endpoint ──

  async query(userId: string, slug: string, question: string) {
    // Find the AI by slug, ensure it belongs to the user
    const ai = await prisma.aI.findFirst({
      where: { slug, userId, status: 'ACTIVE' },
      select: { id: true, name: true, slug: true },
    });

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
    return prisma.aI.findMany({
      where: { userId, status: 'ACTIVE' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        documentCount: true,
      },
    });
  }
}
