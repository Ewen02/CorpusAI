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

// ============================================================================
// SELECT CONSTANTS
// ============================================================================

/**
 * Internal-only AI shape used when starting a conversation — INCLUDES secrets
 * (accessToken, accessCode, inviteOnly) for access-control validation in
 * ConversationsService.checkAIAccess. This object MUST NOT be returned to the
 * client; callers should pick only safe fields.
 */
const AI_FOR_ACCESS_CHECK_SELECT = {
  id: true,
  userId: true,
  slug: true,
  name: true,
  status: true,
  accessToken: true,
  accessCode: true,
  inviteOnly: true,
} as const;

/** Public AI fields safe to embed in conversation responses (no secrets). */
const AI_PUBLIC_EMBED_SELECT = {
  id: true,
  name: true,
  welcomeMessage: true,
  primaryColor: true,
} as const;

/** Minimal Conversation fields (excludes nothing sensitive — Conversation has no secrets). */
const CONVERSATION_BASE_SELECT = {
  id: true,
  aiId: true,
  endUserId: true,
  title: true,
  messageCount: true,
  source: true,
  createdAt: true,
  updatedAt: true,
} as const;

const MESSAGE_PUBLIC_SELECT = {
  id: true,
  role: true,
  content: true,
  sources: true,
  confidence: true,
  feedback: true,
  createdAt: true,
} as const;

@Injectable()
export class ConversationsRepository {
  constructor(private readonly db: PrismaService) {}

  async findAccessGrant(aiId: string, endUserId: string) {
    return this.db.client.aIAccessGrant.findFirst({
      where: { aiId, endUserId, status: AccessStatus.ACTIVE },
      select: { id: true, status: true, expiresAt: true },
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
      select: {
        ...CONVERSATION_BASE_SELECT,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: MESSAGE_PUBLIC_SELECT,
        },
        ai: {
          select: AI_PUBLIC_EMBED_SELECT,
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
      select: MESSAGE_PUBLIC_SELECT,
    });
  }

  /**
   * INTERNAL ONLY — returns AI with accessToken/accessCode for in-memory access
   * checks. Caller must not return this object to the client.
   */
  async findAIBySlugAndUsername(slug: string, username: string) {
    return this.db.client.aI.findFirst({
      where: { slug, user: { username }, deletedAt: null },
      select: AI_FOR_ACCESS_CHECK_SELECT,
    });
  }

  /**
   * INTERNAL ONLY — finds an EndUser by sessionToken. Returns minimal identity
   * (no sessionToken / magicLinkToken in output) so callers cannot accidentally
   * leak credentials.
   */
  async findEndUserBySession(sessionToken: string) {
    return this.db.client.endUser.findFirst({
      where: { sessionToken, sessionExpires: { gt: new Date() } },
      select: { id: true, email: true, name: true, emailVerified: true },
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
        select: {
          ...CONVERSATION_BASE_SELECT,
          ai: {
            select: AI_PUBLIC_EMBED_SELECT,
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
      select: {
        ...CONVERSATION_BASE_SELECT,
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
    tokensIn?: number | null;
    tokensOut?: number | null;
    cost?: number | null;
    model?: string | null;
  }) {
    return this.db.client.message.create({
      data,
      select: MESSAGE_PUBLIC_SELECT,
    });
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
      select: { id: true, feedback: true },
    });
  }

  async findConversationForDelete(conversationId: string) {
    return this.db.client.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        ai: { select: { id: true, userId: true } },
      },
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
