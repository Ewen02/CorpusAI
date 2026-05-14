import { Injectable, NotFoundException } from '@nestjs/common';
import { OwnershipRepository } from './ownership.repository';

export type AIAccessRole = 'OWNER' | 'EDITOR';

@Injectable()
export class OwnershipService {
  constructor(private readonly repo: OwnershipRepository) {}

  /**
   * Strict owner check. Use for destructive / billing / transfer actions.
   */
  async verifyAIOwnership(aiId: string, userId: string): Promise<void> {
    const ai = await this.repo.findAIByIdAndUser(aiId, userId);
    if (!ai) {
      throw new NotFoundException('AI not found');
    }
  }

  /**
   * Returns the AI when owned. Use when full row is needed.
   */
  async getOwnedAI(aiId: string, userId: string) {
    const ai = await this.repo.findFullAIByIdAndUser(aiId, userId);
    if (!ai) {
      throw new NotFoundException('AI not found');
    }
    return ai;
  }

  /**
   * Edit-level access: passes for owner OR EDITOR collaborator (accepted).
   * Use for configuration changes (system prompt, documents, settings) but
   * NEVER for delete / billing / ownership transfer.
   */
  async verifyAIEditAccess(aiId: string, userId: string): Promise<AIAccessRole> {
    const owned = await this.repo.findAIByIdAndUser(aiId, userId);
    if (owned) return 'OWNER';

    const collab = await this.repo.findEditorCollaboration(aiId, userId);
    if (collab) return 'EDITOR';

    throw new NotFoundException('AI not found');
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
