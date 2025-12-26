import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { prisma, MessageRole, AIStatus, ConfidenceLevel } from "@corpusai/database";
import { canAskQuestion } from "@corpusai/subscription";

@Injectable()
export class ConversationsService {
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

  async create(aiSlug: string, endUserSessionId?: string) {
    const ai = await prisma.aI.findUnique({
      where: { slug: aiSlug },
    });

    if (!ai || ai.status !== AIStatus.ACTIVE) {
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
          include: {
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

    // TODO: Implement RAG pipeline
    // 1. Generate embedding for the question
    // 2. Search Qdrant for relevant chunks
    // 3. Build context from chunks
    // 4. Call LLM with context
    // 5. Validate response
    // 6. Save assistant message

    // Placeholder response
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.ASSISTANT,
        content: "This is a placeholder response. The RAG pipeline is not yet implemented.",
        confidence: ConfidenceLevel.LOW,
        sources: [],
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

    return {
      userMessage,
      assistantMessage,
    };
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
}
