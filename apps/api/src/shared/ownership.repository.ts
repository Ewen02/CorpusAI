import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database';

@Injectable()
export class OwnershipRepository {
  constructor(private readonly db: PrismaService) {}

  async findAIByIdAndUser(aiId: string, userId: string) {
    return this.db.client.aI.findFirst({
      where: { id: aiId, userId },
      select: { id: true },
    });
  }

  async findFullAIByIdAndUser(aiId: string, userId: string) {
    return this.db.client.aI.findFirst({
      where: { id: aiId, userId },
    });
  }

  async findDocumentWithOwner(documentId: string) {
    return this.db.client.document.findFirst({
      where: { id: documentId },
      include: {
        ai: {
          select: { id: true, userId: true },
        },
      },
    });
  }

  async findConversationWithOwner(conversationId: string) {
    return this.db.client.conversation.findUnique({
      where: { id: conversationId },
      include: {
        ai: {
          select: { id: true, userId: true },
        },
      },
    });
  }
}
