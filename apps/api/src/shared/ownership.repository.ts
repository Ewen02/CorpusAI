import { Injectable } from '@nestjs/common';
import { CollaboratorRole } from '@corpusai/database';
import { PrismaService } from '../infrastructure/database';

// Safe projection for the owned-AI fetch: never exposes the GATED secrets
// (accessToken / accessCode). systemPrompt is intentionally omitted too — it is
// creator IP and has no place in a document export dump.
const AI_EXPORT_SELECT = {
  id: true,
  userId: true,
  slug: true,
  name: true,
  description: true,
  status: true,
  category: true,
  language: true,
  welcomeMessage: true,
  primaryColor: true,
  logo: true,
  maxTokens: true,
  temperature: true,
  scoreThreshold: true,
  llmModel: true,
  llmProvider: true,
  memoryEnabled: true,
  accessType: true,
  price: true,
  isPublic: true,
  inviteOnly: true,
  documentCount: true,
  conversationCount: true,
  questionCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
      select: AI_EXPORT_SELECT,
    });
  }

  async findDocumentWithOwner(documentId: string) {
    return this.db.client.document.findFirst({
      where: { id: documentId },
      select: {
        id: true,
        ai: { select: { id: true, userId: true } },
      },
    });
  }

  async findConversationWithOwner(conversationId: string) {
    return this.db.client.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        ai: { select: { id: true, userId: true } },
      },
    });
  }

  async findEditorCollaboration(aiId: string, userId: string) {
    return this.db.client.aICollaborator.findFirst({
      where: {
        aiId,
        userId,
        role: CollaboratorRole.EDITOR,
        acceptedAt: { not: null },
      },
      select: { id: true, role: true },
    });
  }
}
