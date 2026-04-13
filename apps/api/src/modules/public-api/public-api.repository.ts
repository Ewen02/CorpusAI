import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';

@Injectable()
export class PublicApiRepository {
  constructor(private readonly db: PrismaService) {}

  async createApiKey(userId: string, name: string, keyHash: string, prefix: string) {
    return this.db.client.apiKey.create({ data: { userId, name, keyHash, prefix } });
  }

  async listApiKeys(userId: string) {
    return this.db.client.apiKey.findMany({
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

  async findApiKey(keyId: string, userId: string) {
    return this.db.client.apiKey.findFirst({ where: { id: keyId, userId } });
  }

  async deleteApiKey(keyId: string) {
    return this.db.client.apiKey.delete({ where: { id: keyId } });
  }

  async findAIBySlugAndUser(slug: string, userId: string) {
    return this.db.client.aI.findFirst({
      where: { slug, userId, status: 'ACTIVE' },
      select: { id: true, name: true, slug: true },
    });
  }

  async listUserAIs(userId: string) {
    return this.db.client.aI.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { id: true, slug: true, name: true, description: true, documentCount: true },
    });
  }
}
