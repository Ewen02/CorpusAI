import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';
import {
  MessageRole,
  AccessStatus,
  ConfidenceLevel,
  type TransactionClient,
  type ConversationSource,
} from '@corpusai/database';
import { incrementDailyStats } from '../../shared/daily-stats';

@Injectable()
export class ConversationsRepository {
  constructor(private readonly db: PrismaService) {}

  async findAccessGrant(aiId: string, endUserId: string) {
    return this.db.client.aIAccessGrant.findFirst({
      where: { aiId, endUserId, status: AccessStatus.ACTIVE },
    });
  }

  async countTodayQuestions(aiId: string, todayStart: Date) {
    return this.db.client.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "Message" m
      JOIN "Conversation" c ON c.id = m."conversationId"
      WHERE c."aiId" = ${aiId}
        AND m.role = 'USER'
        AND m."createdAt" >= ${todayStart}
    `;
  }

  async findConversationHistory(conversationId: string, limit: number) {
    return this.db.client.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { role: true, content: true },
    });
  }

  async findAIPublicInfo(username: string, slug: string) {
    return this.db.client.aI.findFirst({
      where: { slug, user: { username }, deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        welcomeMessage: true,
        primaryColor: true,
        logo: true,
        status: true,
        isPublic: true,
      },
    });
  }

  async findAIByIdAndUser(aiId: string, userId: string) {
    return this.db.client.aI.findFirst({
      where: { id: aiId, userId },
      select: { id: true },
    });
  }

  async findConversationsByAI(aiId: string, source?: ConversationSource) {
    return this.db.client.conversation.findMany({
      where: { aiId, ...(source ? { source } : {}) },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        messageCount: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        endUser: { select: { id: true, email: true, name: true } },
      },
      take: 50,
    });
  }

  async findConversationWithMessages(conversationId: string) {
    return this.db.client.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            role: true,
            content: true,
            sources: true,
            confidence: true,
            feedback: true,
            createdAt: true,
          },
        },
        ai: {
          select: { id: true, name: true, welcomeMessage: true, primaryColor: true },
        },
      },
    });
  }

  async findConversationExists(conversationId: string) {
    return this.db.client.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
  }

  async findMessages(conversationId: string, take: number, cursor?: string) {
    return this.db.client.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        role: true,
        content: true,
        sources: true,
        confidence: true,
        feedback: true,
        createdAt: true,
      },
    });
  }

  async findAIBySlugAndUsername(slug: string, username: string) {
    return this.db.client.aI.findFirst({
      where: { slug, user: { username }, deletedAt: null },
    });
  }

  async findEndUserBySession(sessionToken: string) {
    return this.db.client.endUser.findFirst({
      where: { sessionToken, sessionExpires: { gt: new Date() } },
    });
  }

  async createConversationWithCounterUpdate(
    aiId: string,
    aiUserId: string,
    endUserId: string | undefined,
    source: ConversationSource
  ) {
    return this.db.client.$transaction(async (tx: TransactionClient) => {
      const newConversation = await tx.conversation.create({
        data: { aiId, endUserId, source },
        include: {
          ai: {
            select: { id: true, name: true, welcomeMessage: true, primaryColor: true },
          },
        },
      });

      await tx.aI.update({
        where: { id: aiId },
        data: { conversationCount: { increment: 1 } },
      });

      await incrementDailyStats(tx, aiUserId, aiId, 'conversationCount');

      return newConversation;
    });
  }

  async findConversationWithAI(conversationId: string) {
    return this.db.client.conversation.findUnique({
      where: { id: conversationId },
      include: {
        ai: {
          select: {
            id: true,
            userId: true,
            systemPrompt: true,
            language: true,
            temperature: true,
            maxTokens: true,
            scoreThreshold: true,
            llmModel: true,
            memoryEnabled: true,
            user: { select: { subscriptionPlan: true } },
          },
        },
      },
    });
  }

  async createMessage(data: {
    conversationId: string;
    role: MessageRole;
    content: string;
    confidence?: ConfidenceLevel;
    sources?:
      | Array<{ chunkId: string; documentSource: string; score: number; excerpt: string }>
      | never[];
    latencyMs?: number;
    tokenUsage?: number | null;
  }) {
    return this.db.client.message.create({ data });
  }

  async updateConversationAndQuestionCount(
    conversationId: string,
    aiId: string,
    aiUserId: string,
    title: string | null,
    content: string
  ) {
    return this.db.client.$transaction(async (tx: TransactionClient) => {
      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          messageCount: { increment: 2 },
          title: title || content.slice(0, 50),
        },
      });
      await tx.aI.update({
        where: { id: aiId },
        data: { questionCount: { increment: 1 } },
      });
      await incrementDailyStats(tx, aiUserId, aiId, 'questionCount');
    });
  }

  async findMessageForFeedback(messageId: string) {
    return this.db.client.message.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true, role: true },
    });
  }

  async updateMessageFeedback(messageId: string, feedback: 'positive' | 'negative') {
    return this.db.client.message.update({
      where: { id: messageId },
      data: { feedback },
    });
  }

  async findConversationForDelete(conversationId: string) {
    return this.db.client.conversation.findUnique({
      where: { id: conversationId },
      include: { ai: { select: { id: true, userId: true } } },
    });
  }

  async deleteConversationWithCounterUpdate(conversationId: string, aiId: string) {
    return this.db.client.$transaction([
      this.db.client.conversation.delete({ where: { id: conversationId } }),
      this.db.client.aI.update({
        where: { id: aiId },
        data: { conversationCount: { decrement: 1 } },
      }),
    ]);
  }
}
