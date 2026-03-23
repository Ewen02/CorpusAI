import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import {
  prisma,
  MessageRole,
  AIStatus,
  ConfidenceLevel,
  type TransactionClient,
} from '@corpusai/database';
import { canAskQuestion, type SubscriptionPlanType } from '@corpusai/subscription';
import { determineConfidence, buildSystemPrompt } from '@corpusai/ai-rules';
import type { RAGResponse } from '@corpusai/corpus';
import { RagService } from '../rag';
import { incrementDailyStats } from '../../shared/daily-stats';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private ragService: RagService) {}

  private async checkDailyRateLimit(aiId: string, plan: SubscriptionPlanType): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayQuestions = await prisma.message.count({
      where: {
        conversation: { aiId },
        role: MessageRole.USER,
        createdAt: { gte: todayStart },
      },
    });

    if (!canAskQuestion(plan, todayQuestions)) {
      throw new ForbiddenException('Daily question limit reached for this AI');
    }
  }

  /**
   * Fetches the last N messages from a conversation for multi-turn context.
   */
  private async getConversationHistory(
    conversationId: string,
    limit = 6
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { role: true, content: true },
    });
    return messages
      .reverse()
      .filter(
        (m: { role: string; content: string }) =>
          m.role === MessageRole.USER || m.role === MessageRole.ASSISTANT
      )
      .map((m: { role: string; content: string }) => ({
        role: m.role === MessageRole.USER ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));
  }

  /**
   * Get public AI info for widget embed.
   */
  async getAIPublicInfo(slug: string) {
    const ai = await prisma.aI.findUnique({
      where: { slug },
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

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    return {
      ...ai,
      avatar: ai.logo,
    };
  }

  async findAllByAI(userId: string, aiId: string) {
    // Verify ownership
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    return prisma.conversation.findMany({
      where: { aiId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        messageCount: true,
        createdAt: true,
        updatedAt: true,
        endUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      take: 50,
    });
  }

  async findOne(conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
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
            createdAt: true,
          },
        },
        ai: {
          select: {
            id: true,
            name: true,
            welcomeMessage: true,
            primaryColor: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Reverse messages to chronological order (fetched desc for take limit)
    conversation.messages.reverse();

    return conversation;
  }

  async getMessages(conversationId: string, take = 100, cursor?: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return prisma.message.findMany({
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
        createdAt: true,
      },
    });
  }

  async create(aiSlug: string, endUserSessionId?: string) {
    const ai = await prisma.aI.findUnique({
      where: { slug: aiSlug },
    });

    // Allow ACTIVE and DRAFT (for owner testing)
    if (!ai || (ai.status !== AIStatus.ACTIVE && ai.status !== AIStatus.DRAFT)) {
      throw new NotFoundException('AI not found or not active');
    }

    // Find or create end user
    let endUserId: string | undefined;
    if (endUserSessionId) {
      let endUser = await prisma.endUser.findFirst({
        where: { sessionId: endUserSessionId },
      });

      if (!endUser) {
        endUser = await prisma.endUser.create({
          data: { sessionId: endUserSessionId },
        });
      }

      endUserId = endUser.id;
    }

    // Use transaction to ensure conversation creation and counter update are atomic
    const conversation = await prisma.$transaction(async (tx: TransactionClient) => {
      const newConversation = await tx.conversation.create({
        data: {
          aiId: ai.id,
          endUserId,
        },
        include: {
          ai: {
            select: {
              id: true,
              name: true,
              welcomeMessage: true,
              primaryColor: true,
            },
          },
        },
      });

      // Update AI conversation count atomically
      await tx.aI.update({
        where: { id: ai.id },
        data: { conversationCount: { increment: 1 } },
      });

      await incrementDailyStats(tx, ai.userId, ai.id, 'conversationCount');

      return newConversation;
    });

    return conversation;
  }

  async sendMessage(conversationId: string, content: string) {
    const conversation = await prisma.conversation.findUnique({
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
            user: {
              select: { subscriptionPlan: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check rate limits
    await this.checkDailyRateLimit(conversation.aiId, conversation.ai.user.subscriptionPlan);

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.USER,
        content,
      },
    });

    const conversationHistory = await this.getConversationHistory(conversationId);

    // Query RAG pipeline
    const startTime = Date.now();
    let assistantMessage;
    let isError = false;

    try {
      const ragResponse = await this.ragService.query(
        conversation.aiId,
        content,
        {
          systemPrompt: buildSystemPrompt({
            customPrompt: conversation.ai.systemPrompt ?? undefined,
            language: conversation.ai.language,
          }),
          temperature: conversation.ai.temperature,
          maxTokens: conversation.ai.maxTokens,
        },
        {
          scoreThreshold: conversation.ai.scoreThreshold ?? 0.4,
          conversationHistory,
        }
      );

      const latencyMs = Date.now() - startTime;

      // Calculate confidence based on source scores
      const confidence = determineConfidence(
        ragResponse.sources.map((s) => ({ relevanceScore: s.score }))
      ) as ConfidenceLevel;

      // Format sources for storage
      const sources = ragResponse.sources.map((s) => ({
        chunkId: s.chunkId,
        documentSource: s.documentSource,
        score: s.score,
        excerpt: s.text.slice(0, 200),
      }));

      assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.ASSISTANT,
          content: ragResponse.answer,
          confidence,
          sources,
          latencyMs,
          tokenUsage: ragResponse.metrics?.totalTokens ?? null,
        },
      });

      this.logger.log(
        `RAG response for conversation ${conversationId}: ${ragResponse.sources.length} sources, ${latencyMs}ms, ${ragResponse.metrics?.totalTokens ?? '?'} tokens`
      );
    } catch (error) {
      this.logger.error(`RAG query failed: ${error}`);
      isError = true;

      // Fallback response on error
      assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.ASSISTANT,
          content: "Je suis désolé, je n'ai pas pu traiter votre question. Veuillez réessayer.",
          confidence: ConfidenceLevel.LOW,
          sources: [],
        },
      });
    }

    // Update conversation and AI question count atomically
    await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          messageCount: { increment: 2 },
          title: conversation.title || content.slice(0, 50),
        },
      });
      await tx.aI.update({
        where: { id: conversation.aiId },
        data: { questionCount: { increment: 1 } },
      });
      await incrementDailyStats(tx, conversation.ai.userId, conversation.aiId, 'questionCount');
    });

    return {
      userMessage,
      assistantMessage,
      isError,
      errorType: isError ? ('rag_failure' as const) : undefined,
    };
  }

  /**
   * Type pour les événements de streaming.
   */
  static StreamEventType = {
    TOKEN: 'token',
    SOURCES: 'sources',
    DONE: 'done',
    ERROR: 'error',
  } as const;

  /**
   * Envoie un message avec streaming de la réponse.
   */
  async *sendMessageStream(
    conversationId: string,
    content: string
  ): AsyncGenerator<{
    type: 'token' | 'sources' | 'done' | 'error';
    data: unknown;
  }> {
    const conversation = await prisma.conversation.findUnique({
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
            user: {
              select: { subscriptionPlan: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      yield { type: 'error', data: { message: 'Conversation not found' } };
      return;
    }

    // Check rate limits
    try {
      await this.checkDailyRateLimit(conversation.aiId, conversation.ai.user.subscriptionPlan);
    } catch {
      yield { type: 'error', data: { message: 'Daily question limit reached for this AI' } };
      return;
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.USER,
        content,
      },
    });

    const conversationHistory = await this.getConversationHistory(conversationId);

    const startTime = Date.now();

    try {
      // Stream RAG response
      const generator = this.ragService.queryStream(
        conversation.aiId,
        content,
        {
          systemPrompt: buildSystemPrompt({
            customPrompt: conversation.ai.systemPrompt ?? undefined,
            language: conversation.ai.language,
          }),
          temperature: conversation.ai.temperature,
          maxTokens: conversation.ai.maxTokens,
        },
        {
          scoreThreshold: conversation.ai.scoreThreshold ?? 0.4,
          conversationHistory,
        }
      );

      // Yield tokens as they come
      let result: IteratorResult<string, RAGResponse>;
      while (!(result = await generator.next()).done) {
        const token = result.value;
        yield { type: 'token', data: { token } };
      }

      const ragResponse = result.value;
      const latencyMs = Date.now() - startTime;

      // Calculate confidence and format sources
      const confidence = determineConfidence(
        ragResponse.sources.map((s) => ({ relevanceScore: s.score }))
      ) as ConfidenceLevel;
      const sources = ragResponse.sources.map((s) => ({
        chunkId: s.chunkId,
        documentSource: s.documentSource,
        score: s.score,
        excerpt: s.text.slice(0, 200),
      }));

      // Yield sources
      yield { type: 'sources', data: { sources } };

      // Save assistant message
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.ASSISTANT,
          content: ragResponse.answer,
          confidence,
          sources,
          latencyMs,
          tokenUsage: ragResponse.metrics?.totalTokens ?? null,
        },
      });

      // Update conversation and AI question count atomically
      await prisma.$transaction(async (tx: TransactionClient) => {
        await tx.conversation.update({
          where: { id: conversationId },
          data: {
            messageCount: { increment: 2 },
            title: conversation.title || content.slice(0, 50),
          },
        });
        await tx.aI.update({
          where: { id: conversation.aiId },
          data: { questionCount: { increment: 1 } },
        });
        await incrementDailyStats(tx, conversation.ai.userId, conversation.aiId, 'questionCount');
      });

      this.logger.log(
        `RAG stream for conversation ${conversationId}: ${ragResponse.sources.length} sources, ${latencyMs}ms`
      );

      // Yield done event
      yield {
        type: 'done',
        data: {
          userMessage: {
            id: userMessage.id,
            role: userMessage.role,
            content: userMessage.content,
            createdAt: userMessage.createdAt,
          },
          assistantMessage: {
            id: assistantMessage.id,
            role: assistantMessage.role,
            content: assistantMessage.content,
            sources,
            confidence,
            createdAt: assistantMessage.createdAt,
          },
        },
      };
    } catch (error) {
      this.logger.error(`RAG stream failed: ${error}`);

      // Save fallback response
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.ASSISTANT,
          content: "Je suis désolé, je n'ai pas pu traiter votre question. Veuillez réessayer.",
          confidence: ConfidenceLevel.LOW,
          sources: [],
        },
      });

      yield {
        type: 'error',
        data: {
          message: 'Failed to generate response',
          assistantMessage: {
            id: assistantMessage.id,
            role: assistantMessage.role,
            content: assistantMessage.content,
            sources: [],
            confidence: ConfidenceLevel.LOW,
            createdAt: assistantMessage.createdAt,
          },
        },
      };
    }
  }

  async delete(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        ai: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!conversation || conversation.ai.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    // Delete conversation and update counter atomically
    await prisma.$transaction([
      prisma.conversation.delete({
        where: { id: conversationId },
      }),
      prisma.aI.update({
        where: { id: conversation.ai.id },
        data: { conversationCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  }
}
