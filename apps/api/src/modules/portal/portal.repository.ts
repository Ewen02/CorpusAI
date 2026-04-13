import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';
import { AccessStatus } from '@corpusai/database';

@Injectable()
export class PortalRepository {
  constructor(private readonly db: PrismaService) {}

  async findActiveGrants(endUserId: string) {
    return this.db.client.aIAccessGrant.findMany({
      where: {
        endUserId,
        status: AccessStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        ai: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            primaryColor: true,
            logo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findConversations(endUserId: string) {
    return this.db.client.conversation.findMany({
      where: { endUserId, messageCount: { gt: 0 } },
      select: {
        id: true,
        title: true,
        messageCount: true,
        createdAt: true,
        updatedAt: true,
        ai: { select: { id: true, slug: true, name: true, primaryColor: true, logo: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findConversation(endUserId: string, conversationId: string) {
    return this.db.client.conversation.findFirst({
      where: { id: conversationId, endUserId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        ai: { select: { id: true, slug: true, name: true, primaryColor: true, logo: true } },
      },
    });
  }
}
