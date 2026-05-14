import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';
import { AccessStatus } from '@corpusai/database';

const AI_PORTAL_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  primaryColor: true,
  logo: true,
} as const;

const MESSAGE_PORTAL_SELECT = {
  id: true,
  role: true,
  content: true,
  sources: true,
  confidence: true,
  feedback: true,
  createdAt: true,
} as const;

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
      select: {
        id: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        ai: {
          select: AI_PORTAL_SELECT,
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
        ai: { select: AI_PORTAL_SELECT },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findConversation(endUserId: string, conversationId: string) {
    return this.db.client.conversation.findFirst({
      where: { id: conversationId, endUserId },
      select: {
        id: true,
        title: true,
        messageCount: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: MESSAGE_PORTAL_SELECT,
        },
        ai: { select: AI_PORTAL_SELECT },
      },
    });
  }
}
