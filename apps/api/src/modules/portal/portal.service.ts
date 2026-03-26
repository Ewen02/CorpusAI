import { Injectable, NotFoundException } from '@nestjs/common';
import { AccessStatus, prisma, type EndUser } from '@corpusai/database';

@Injectable()
export class PortalService {
  async getMe(endUser: EndUser) {
    const grants = await prisma.aIAccessGrant.findMany({
      where: {
        endUserId: endUser.id,
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

    return {
      id: endUser.id,
      email: endUser.email,
      name: endUser.name,
      emailVerified: endUser.emailVerified,
      createdAt: endUser.createdAt,
      ais: grants.map((g) => g.ai),
    };
  }

  async getConversations(endUser: EndUser) {
    return prisma.conversation.findMany({
      where: { endUserId: endUser.id, messageCount: { gt: 0 } },
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

  async getConversation(endUser: EndUser, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, endUserId: endUser.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        ai: { select: { id: true, slug: true, name: true, primaryColor: true, logo: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }
}
