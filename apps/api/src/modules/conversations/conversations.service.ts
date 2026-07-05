import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AIStatus, ConversationSource } from '@corpusai/database';
import { canAskQuestion, type SubscriptionPlanType } from '@corpusai/subscription';
import { WebhooksService } from '../webhooks';
import { ConversationsRepository } from './conversations.repository';
import { AccessControlService } from './access-control.service';
import { MessageHistoryService } from './message-history.service';
import { RagOrchestratorService, type StreamEvent } from './rag-orchestrator.service';

/**
 * Top-level orchestrator for the conversations feature.
 *
 * Concerns delegated to sub-services (same module):
 * - {@link AccessControlService}     — OPEN / GATED / MEMBER access enforcement
 * - {@link MessageHistoryService}    — message reads, writes, feedback
 * - {@link RagOrchestratorService}   — sync + streaming RAG flows
 *
 * This service owns: CRUD on conversations, daily rate-limit, conversation
 * lifecycle (create / delete) including end-user resolution and webhooks.
 */
@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly repo: ConversationsRepository,
    private readonly accessControl: AccessControlService,
    private readonly messageHistory: MessageHistoryService,
    private readonly ragOrchestrator: RagOrchestratorService
  ) {}

  // ============================================================================
  // Rate limiting
  // ============================================================================

  private async checkDailyRateLimit(
    ownerUserId: string,
    aiId: string,
    plan: SubscriptionPlanType
  ): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Point read of the denormalized DailyStats.questionCount (written in the
    // same flow via incrementDailyStats) instead of a COUNT(*) JOIN per message.
    const count = await this.repo.getTodayQuestionCount(ownerUserId, aiId, todayStart);

    if (!canAskQuestion(plan, count)) {
      throw new ForbiddenException('Daily question limit reached for this AI');
    }
  }

  // ============================================================================
  // Read endpoints
  // ============================================================================

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
    return this.messageHistory.getMessages(conversationId, take, cursor);
  }

  async updateMessageFeedback(
    conversationId: string,
    messageId: string,
    feedback: 'positive' | 'negative'
  ) {
    return this.messageHistory.updateMessageFeedback(conversationId, messageId, feedback);
  }

  // ============================================================================
  // Conversation lifecycle
  // ============================================================================

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

    let endUser: { id: string; email: string } | null = null;
    if (endUserSessionToken) {
      endUser = await this.repo.findEndUserBySession(endUserSessionToken);
    }

    await this.accessControl.checkAIAccess(ai, accessToken, accessCode, endUser);

    const conversation = await this.repo.createConversationWithCounterUpdate(
      ai.id,
      ai.userId,
      endUser?.id,
      source
    );

    this.webhooksService
      .emit(ai.userId, 'conversation.started', {
        conversationId: conversation.id,
        aiId: ai.id,
        source,
      })
      .catch((err) => this.logger.warn(`webhook emit failed: ${err}`));

    return conversation;
  }

  async delete(userId: string, conversationId: string) {
    const conversation = await this.repo.findConversationForDelete(conversationId);

    if (!conversation || conversation.ai.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    await this.repo.deleteConversationWithCounterUpdate(conversationId, conversation.ai.id);
    return { success: true };
  }

  // ============================================================================
  // Messaging — delegate to RagOrchestratorService
  // ============================================================================

  async sendMessage(conversationId: string, content: string) {
    const conversation = await this.repo.findConversationWithAI(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.checkDailyRateLimit(
      conversation.ai.userId,
      conversation.aiId,
      conversation.ai.user.subscriptionPlan
    );

    return this.ragOrchestrator.runSync(conversation, content);
  }

  static StreamEventType = {
    TOKEN: 'token',
    SOURCES: 'sources',
    DONE: 'done',
    ERROR: 'error',
  } as const;

  async *sendMessageStream(conversationId: string, content: string): AsyncGenerator<StreamEvent> {
    const conversation = await this.repo.findConversationWithAI(conversationId);

    if (!conversation) {
      yield { type: 'error', data: { message: 'Conversation not found' } };
      return;
    }

    try {
      await this.checkDailyRateLimit(
        conversation.ai.userId,
        conversation.aiId,
        conversation.ai.user.subscriptionPlan
      );
    } catch {
      yield { type: 'error', data: { message: 'Daily question limit reached for this AI' } };
      return;
    }

    yield* this.ragOrchestrator.runStream(conversation, content);
  }
}
