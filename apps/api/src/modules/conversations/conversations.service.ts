import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  MessageRole,
  AIStatus,
  ConfidenceLevel,
  ConversationSource,
  type AI,
  type EndUser,
} from '@corpusai/database';
import * as bcrypt from 'bcryptjs';
import { canAskQuestion, type SubscriptionPlanType } from '@corpusai/subscription';
import { determineConfidence, buildSystemPrompt } from '@corpusai/ai-rules';
import type { RAGResponse } from '@corpusai/corpus';
import { RagService } from '../rag';
import { WebhooksService } from '../webhooks';
import { EndUserMemoryService } from './memory.service';
import { ConversationsRepository } from './conversations.repository';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private ragService: RagService,
    private webhooksService: WebhooksService,
    private memoryService: EndUserMemoryService,
    private readonly repo: ConversationsRepository
  ) {}

  private async checkAIAccess(
    ai: AI,
    accessToken?: string,
    accessCode?: string,
    endUser?: EndUser | null
  ): Promise<void> {
    if (ai.accessToken && accessToken !== ai.accessToken) {
      throw new UnauthorizedException({ reason: 'access_token' });
    }

    if (ai.accessCode) {
      const valid = !!accessCode && (await bcrypt.compare(accessCode, ai.accessCode));
      if (!valid) {
        throw new UnauthorizedException({ reason: 'access_code' });
      }
    }

    if (ai.inviteOnly) {
      if (!endUser) {
        throw new UnauthorizedException({ reason: 'invite_only' });
      }
      const grant = await this.repo.findAccessGrant(ai.id, endUser.id);
      if (!grant || (grant.expiresAt && grant.expiresAt < new Date())) {
        throw new UnauthorizedException({ reason: 'invite_only' });
      }
    }
  }

  private async checkDailyRateLimit(aiId: string, plan: SubscriptionPlanType): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ count }] = await this.repo.countTodayQuestions(aiId, todayStart);

    if (!canAskQuestion(plan, Number(count))) {
      throw new ForbiddenException('Daily question limit reached for this AI');
    }
  }

  private async getConversationHistory(
    conversationId: string,
    limit = 6
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const messages = await this.repo.findConversationHistory(conversationId, limit);
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

  async getAIPublicInfo(username: string, slug: string) {
    const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
    const ai = await this.repo.findAIPublicInfo(normalizedUsername, slug);

    if (!ai || !ai.isPublic || ai.status !== AIStatus.ACTIVE) {
      throw new NotFoundException('AI not found');
    }

    return {
      id: ai.id,
      slug: ai.slug,
      name: ai.name,
      description: ai.description,
      welcomeMessage: ai.welcomeMessage,
      primaryColor: ai.primaryColor,
      avatar: ai.logo,
    };
  }

  async findAllByAI(userId: string, aiId: string, source?: ConversationSource) {
    const ai = await this.repo.findAIByIdAndUser(aiId, userId);

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    return this.repo.findConversationsByAI(aiId, source);
  }

  async findOne(conversationId: string) {
    const conversation = await this.repo.findConversationWithMessages(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.messages.reverse();
    return conversation;
  }

  async getMessages(conversationId: string, take = 100, cursor?: string) {
    const conversation = await this.repo.findConversationExists(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.repo.findMessages(conversationId, take, cursor);
  }

  async create(
    username: string,
    aiSlug: string,
    endUserSessionToken?: string,
    source: ConversationSource = ConversationSource.DASHBOARD,
    accessToken?: string,
    accessCode?: string
  ) {
    const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
    const ai = await this.repo.findAIBySlugAndUsername(aiSlug, normalizedUsername);

    if (!ai || (ai.status !== AIStatus.ACTIVE && ai.status !== AIStatus.DRAFT)) {
      throw new NotFoundException('AI not found or not active');
    }

    let endUser: EndUser | null = null;
    if (endUserSessionToken) {
      endUser = await this.repo.findEndUserBySession(endUserSessionToken);
    }

    await this.checkAIAccess(ai, accessToken, accessCode, endUser);

    const endUserId = endUser?.id;

    const conversation = await this.repo.createConversationWithCounterUpdate(
      ai.id,
      ai.userId,
      endUserId,
      source
    );

    this.webhooksService
      .emit(ai.userId, 'conversation.started', {
        conversationId: conversation.id,
        aiId: ai.id,
        source,
      })
      .catch(() => {});

    return conversation;
  }

  async sendMessage(conversationId: string, content: string) {
    const conversation = await this.repo.findConversationWithAI(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.checkDailyRateLimit(conversation.aiId, conversation.ai.user.subscriptionPlan);

    const userMessage = await this.repo.createMessage({
      conversationId,
      role: MessageRole.USER,
      content,
    });

    const conversationHistory = await this.getConversationHistory(conversationId);

    let memoryContext: string | undefined;
    if (conversation.ai.memoryEnabled && conversation.endUserId) {
      memoryContext =
        (await this.memoryService.getMemory(conversation.endUserId, conversation.aiId)) ??
        undefined;
    }

    const startTime = Date.now();
    let assistantMessage;
    let isError = false;

    try {
      const ragResponse = await this.ragService.query(
        conversation.aiId,
        content,
        {
          model: conversation.ai.llmModel,
          systemPrompt: buildSystemPrompt({
            customPrompt: conversation.ai.systemPrompt ?? undefined,
            language: conversation.ai.language,
            memoryContext,
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

      const confidence = determineConfidence(
        ragResponse.sources.map((s) => ({ relevanceScore: s.score }))
      ) as ConfidenceLevel;

      const sources = ragResponse.sources.map((s) => ({
        chunkId: s.chunkId,
        documentSource: s.documentSource,
        score: s.score,
        excerpt: s.text.slice(0, 200),
      }));

      assistantMessage = await this.repo.createMessage({
        conversationId,
        role: MessageRole.ASSISTANT,
        content: ragResponse.answer,
        confidence,
        sources,
        latencyMs,
        tokenUsage: ragResponse.metrics?.totalTokens ?? null,
      });

      this.logger.log(
        `RAG response for conversation ${conversationId}: ${ragResponse.sources.length} sources, ${latencyMs}ms, ${ragResponse.metrics?.totalTokens ?? '?'} tokens`
      );

      this.webhooksService
        .emit(conversation.ai.userId, 'conversation.message.created', {
          messageId: assistantMessage.id,
          conversationId,
          aiId: conversation.aiId,
          role: MessageRole.ASSISTANT,
          content: ragResponse.answer.slice(0, 500),
        })
        .catch(() => {});
    } catch (error) {
      this.logger.error(`RAG query failed: ${error}`);
      isError = true;

      assistantMessage = await this.repo.createMessage({
        conversationId,
        role: MessageRole.ASSISTANT,
        content:
          conversation.ai.language === 'en'
            ? "I'm sorry, I couldn't process your question. Please try again."
            : "Je suis désolé, je n'ai pas pu traiter votre question. Veuillez réessayer.",
        confidence: ConfidenceLevel.LOW,
        sources: [],
      });
    }

    await this.repo.updateConversationAndQuestionCount(
      conversationId,
      conversation.aiId,
      conversation.ai.userId,
      conversation.title,
      content
    );

    if (
      conversation.ai.memoryEnabled &&
      conversation.endUserId &&
      conversation.messageCount + 2 >= 4
    ) {
      this.memoryService
        .updateMemory(conversation.endUserId, conversation.aiId, conversationId)
        .catch((err) => this.logger.warn(`Memory update failed: ${err}`));
    }

    return {
      userMessage,
      assistantMessage,
      isError,
      errorType: isError ? ('rag_failure' as const) : undefined,
    };
  }

  static StreamEventType = {
    TOKEN: 'token',
    SOURCES: 'sources',
    DONE: 'done',
    ERROR: 'error',
  } as const;

  async *sendMessageStream(
    conversationId: string,
    content: string
  ): AsyncGenerator<{
    type: 'token' | 'sources' | 'done' | 'error';
    data: unknown;
  }> {
    const conversation = await this.repo.findConversationWithAI(conversationId);

    if (!conversation) {
      yield { type: 'error', data: { message: 'Conversation not found' } };
      return;
    }

    try {
      await this.checkDailyRateLimit(conversation.aiId, conversation.ai.user.subscriptionPlan);
    } catch {
      yield { type: 'error', data: { message: 'Daily question limit reached for this AI' } };
      return;
    }

    const userMessage = await this.repo.createMessage({
      conversationId,
      role: MessageRole.USER,
      content,
    });

    const conversationHistory = await this.getConversationHistory(conversationId);

    let memoryContext: string | undefined;
    if (conversation.ai.memoryEnabled && conversation.endUserId) {
      memoryContext =
        (await this.memoryService.getMemory(conversation.endUserId, conversation.aiId)) ??
        undefined;
    }

    const startTime = Date.now();

    try {
      const generator = this.ragService.queryStream(
        conversation.aiId,
        content,
        {
          model: conversation.ai.llmModel,
          systemPrompt: buildSystemPrompt({
            customPrompt: conversation.ai.systemPrompt ?? undefined,
            language: conversation.ai.language,
            memoryContext,
          }),
          temperature: conversation.ai.temperature,
          maxTokens: conversation.ai.maxTokens,
        },
        {
          scoreThreshold: conversation.ai.scoreThreshold ?? 0.4,
          conversationHistory,
        }
      );

      let result: IteratorResult<string, RAGResponse>;
      while (!(result = await generator.next()).done) {
        const token = result.value;
        yield { type: 'token', data: { token } };
      }

      const ragResponse = result.value;
      const latencyMs = Date.now() - startTime;

      const confidence = determineConfidence(
        ragResponse.sources.map((s) => ({ relevanceScore: s.score }))
      ) as ConfidenceLevel;
      const sources = ragResponse.sources.map((s) => ({
        chunkId: s.chunkId,
        documentSource: s.documentSource,
        score: s.score,
        excerpt: s.text.slice(0, 200),
      }));

      yield { type: 'sources', data: { sources } };

      const assistantMessage = await this.repo.createMessage({
        conversationId,
        role: MessageRole.ASSISTANT,
        content: ragResponse.answer,
        confidence,
        sources,
        latencyMs,
        tokenUsage: ragResponse.metrics?.totalTokens ?? null,
      });

      await this.repo.updateConversationAndQuestionCount(
        conversationId,
        conversation.aiId,
        conversation.ai.userId,
        conversation.title,
        content
      );

      this.logger.log(
        `RAG stream for conversation ${conversationId}: ${ragResponse.sources.length} sources, ${latencyMs}ms`
      );

      this.webhooksService
        .emit(conversation.ai.userId, 'conversation.message.created', {
          messageId: assistantMessage.id,
          conversationId,
          aiId: conversation.aiId,
          role: MessageRole.ASSISTANT,
          content: ragResponse.answer.slice(0, 500),
        })
        .catch(() => {});

      if (
        conversation.ai.memoryEnabled &&
        conversation.endUserId &&
        conversation.messageCount + 2 >= 4
      ) {
        this.memoryService
          .updateMemory(conversation.endUserId, conversation.aiId, conversationId)
          .catch((err) => this.logger.warn(`Memory update failed: ${err}`));
      }

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
            feedback: null,
            createdAt: assistantMessage.createdAt,
          },
        },
      };
    } catch (error) {
      this.logger.error(`RAG stream failed: ${error}`);

      const assistantMessage = await this.repo.createMessage({
        conversationId,
        role: MessageRole.ASSISTANT,
        content:
          conversation.ai.language === 'en'
            ? "I'm sorry, I couldn't process your question. Please try again."
            : "Je suis désolé, je n'ai pas pu traiter votre question. Veuillez réessayer.",
        confidence: ConfidenceLevel.LOW,
        sources: [],
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

  async updateMessageFeedback(
    conversationId: string,
    messageId: string,
    feedback: 'positive' | 'negative'
  ) {
    const message = await this.repo.findMessageForFeedback(messageId);

    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException('Message not found');
    }

    if (message.role !== MessageRole.ASSISTANT) {
      throw new BadRequestException('Feedback can only be given on assistant messages');
    }

    await this.repo.updateMessageFeedback(messageId, feedback);
    return { id: messageId, feedback };
  }

  async delete(userId: string, conversationId: string) {
    const conversation = await this.repo.findConversationForDelete(conversationId);

    if (!conversation || conversation.ai.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    await this.repo.deleteConversationWithCounterUpdate(conversationId, conversation.ai.id);
    return { success: true };
  }
}
