import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { prisma, MessageRole, AIStatus, ConfidenceLevel } from "@corpusai/database";
import { canAskQuestion } from "@corpusai/subscription";
import type { Source } from "@corpusai/corpus";
import { RagService } from "../rag";

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private ragService: RagService) {}
  async findAllByAI(userId: string, aiId: string) {
    // Verify ownership
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
    });

    if (!ai) {
      throw new NotFoundException("AI not found");
    }

    return prisma.conversation.findMany({
      where: { aiId },
      orderBy: { updatedAt: "desc" },
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
          orderBy: { createdAt: "asc" },
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
      throw new NotFoundException("Conversation not found");
    }

    return conversation;
  }

  async getMessages(conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
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
      throw new NotFoundException("AI not found or not active");
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

    const conversation = await prisma.conversation.create({
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

    // Update AI conversation count
    await prisma.aI.update({
      where: { id: ai.id },
      data: { conversationCount: { increment: 1 } },
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
            systemPrompt: true,
            temperature: true,
            maxTokens: true,
            user: {
              select: { subscriptionPlan: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    // Check rate limits
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayQuestions = await prisma.message.count({
      where: {
        conversation: {
          aiId: conversation.aiId,
        },
        role: MessageRole.USER,
        createdAt: { gte: todayStart },
      },
    });

    if (!canAskQuestion(conversation.ai.user.subscriptionPlan, todayQuestions)) {
      throw new ForbiddenException(
        "Daily question limit reached for this AI"
      );
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.USER,
        content,
      },
    });

    // Query RAG pipeline
    const startTime = Date.now();
    let assistantMessage;

    try {
      const ragResponse = await this.ragService.query(
        conversation.aiId,
        content,
        {
          systemPrompt: conversation.ai.systemPrompt ?? undefined,
          temperature: conversation.ai.temperature,
          maxTokens: conversation.ai.maxTokens,
        }
      );

      const latencyMs = Date.now() - startTime;

      // Calculate confidence based on source scores
      const confidence = this.calculateConfidence(ragResponse.sources);

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
        },
      });

      this.logger.log(
        `RAG response for conversation ${conversationId}: ${ragResponse.sources.length} sources, ${latencyMs}ms`
      );
    } catch (error) {
      this.logger.error(`RAG query failed: ${error}`);

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

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 2 },
        title: conversation.title || content.slice(0, 50),
      },
    });

    // Update AI question count
    await prisma.aI.update({
      where: { id: conversation.aiId },
      data: { questionCount: { increment: 1 } },
    });

    return {
      userMessage,
      assistantMessage,
    };
  }

  /**
   * Type pour les événements de streaming.
   */
  static StreamEventType = {
    TOKEN: "token",
    SOURCES: "sources",
    DONE: "done",
    ERROR: "error",
  } as const;

  /**
   * Envoie un message avec streaming de la réponse.
   */
  async *sendMessageStream(conversationId: string, content: string): AsyncGenerator<{
    type: "token" | "sources" | "done" | "error";
    data: unknown;
  }> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        ai: {
          select: {
            id: true,
            systemPrompt: true,
            temperature: true,
            maxTokens: true,
            user: {
              select: { subscriptionPlan: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      yield { type: "error", data: { message: "Conversation not found" } };
      return;
    }

    // Check rate limits
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayQuestions = await prisma.message.count({
      where: {
        conversation: { aiId: conversation.aiId },
        role: MessageRole.USER,
        createdAt: { gte: todayStart },
      },
    });

    if (!canAskQuestion(conversation.ai.user.subscriptionPlan, todayQuestions)) {
      yield { type: "error", data: { message: "Daily question limit reached for this AI" } };
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

    const startTime = Date.now();

    try {
      // Stream RAG response
      const generator = this.ragService.queryStream(
        conversation.aiId,
        content,
        {
          systemPrompt: conversation.ai.systemPrompt ?? undefined,
          temperature: conversation.ai.temperature,
          maxTokens: conversation.ai.maxTokens,
        }
      );

      let fullAnswer = "";
      let ragResponse: { answer: string; sources: Source[]; context: string } | undefined;

      // Yield tokens as they come
      let result: IteratorResult<string, { answer: string; sources: Source[]; context: string }>;
      while (!(result = await generator.next()).done) {
        const token = result.value;
        fullAnswer += token;
        yield { type: "token", data: { token } };
      }

      ragResponse = result.value;
      const latencyMs = Date.now() - startTime;

      // Calculate confidence and format sources
      const confidence = this.calculateConfidence(ragResponse.sources);
      const sources = ragResponse.sources.map((s) => ({
        chunkId: s.chunkId,
        documentSource: s.documentSource,
        score: s.score,
        excerpt: s.text.slice(0, 200),
      }));

      // Yield sources
      yield { type: "sources", data: { sources } };

      // Save assistant message
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.ASSISTANT,
          content: ragResponse.answer,
          confidence,
          sources,
          latencyMs,
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          messageCount: { increment: 2 },
          title: conversation.title || content.slice(0, 50),
        },
      });

      // Update AI question count
      await prisma.aI.update({
        where: { id: conversation.aiId },
        data: { questionCount: { increment: 1 } },
      });

      this.logger.log(
        `RAG stream for conversation ${conversationId}: ${ragResponse.sources.length} sources, ${latencyMs}ms`
      );

      // Yield done event
      yield {
        type: "done",
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
        type: "error",
        data: {
          message: "Failed to generate response",
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
      throw new NotFoundException("Conversation not found");
    }

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    // Update AI conversation count
    await prisma.aI.update({
      where: { id: conversation.ai.id },
      data: { conversationCount: { decrement: 1 } },
    });

    return { success: true };
  }

  /**
   * Calculate confidence level based on source scores.
   */
  private calculateConfidence(sources: Source[]): ConfidenceLevel {
    if (sources.length === 0) {
      return ConfidenceLevel.LOW;
    }

    const avgScore = sources.reduce((sum, s) => sum + s.score, 0) / sources.length;

    if (avgScore > 0.7) {
      return ConfidenceLevel.HIGH;
    }
    if (avgScore > 0.5) {
      return ConfidenceLevel.MEDIUM;
    }
    return ConfidenceLevel.LOW;
  }
}
