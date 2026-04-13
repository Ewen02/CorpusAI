import { Injectable, NotFoundException } from '@nestjs/common';
import { OwnershipRepository } from './ownership.repository';

@Injectable()
export class OwnershipService {
  constructor(private readonly repo: OwnershipRepository) {}

  async verifyAIOwnership(aiId: string, userId: string): Promise<void> {
    const ai = await this.repo.findAIByIdAndUser(aiId, userId);
    if (!ai) {
      throw new NotFoundException('AI not found');
    }
  }

  async getOwnedAI(aiId: string, userId: string) {
    const ai = await this.repo.findFullAIByIdAndUser(aiId, userId);
    if (!ai) {
      throw new NotFoundException('AI not found');
    }
    return ai;
  }

  async verifyDocumentOwnership(
    documentId: string,
    userId: string
  ): Promise<{ documentId: string; aiId: string }> {
    const document = await this.repo.findDocumentWithOwner(documentId);
    if (!document || document.ai.userId !== userId) {
      throw new NotFoundException('Document not found');
    }
    return { documentId: document.id, aiId: document.ai.id };
  }

  async verifyConversationOwnership(
    conversationId: string,
    userId: string
  ): Promise<{ conversationId: string; aiId: string }> {
    const conversation = await this.repo.findConversationWithOwner(conversationId);
    if (!conversation || conversation.ai.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }
    return { conversationId: conversation.id, aiId: conversation.ai.id };
  }
}
