import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';

@Injectable()
export class AuthRepository {
  constructor(private readonly db: PrismaService) {}

  async findUserById(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });
  }

  async findUserWithAIs(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        username: true,
        role: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        createdAt: true,
        ais: {
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
            documentCount: true,
            conversationCount: true,
          },
        },
      },
    });
  }

  /**
   * INTERNAL ONLY — guard lookup by API key hash. Caller must not return raw record.
   */
  async findApiKeyByHash(keyHash: string) {
    return this.db.client.apiKey.findUnique({
      where: { keyHash },
      select: { id: true, userId: true, expiresAt: true },
    });
  }

  async touchApiKeyLastUsed(apiKeyId: string) {
    return this.db.client.apiKey.update({
      where: { id: apiKeyId },
      data: { lastUsedAt: new Date() },
      select: { id: true },
    });
  }
}
