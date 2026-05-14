import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageRole, ConfidenceLevel } from '@corpusai/database';
import type { RAGResponse } from '@corpusai/corpus';
import { determineConfidence } from '@corpusai/ai-rules';
import { computeMessageCost } from '../../shared';
import { ConversationsRepository } from './conversations.repository';

export type ConversationHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type MessageSource = {
  chunkId: string;
  documentSource: string;
  score: number;
  excerpt: string;
};

export type RagOutcome = {
  sources: MessageSource[];
  confidence: ConfidenceLevel;
};

/**
 * Read/write helpers around messages within a conversation.
 *
 * Owns:
 * - history hydration for LLM context windows
 * - paginated message listing
 * - persistence of user / assistant / fallback messages
 * - mapping RAG sources -> persistable shape
 * - feedback updates with role and conversation checks
 */
@Injectable()
export class MessageHistoryService {
  constructor(private readonly repo: ConversationsRepository) {}

  // ============================================================================
  // History (for LLM context)
  // ============================================================================

  async getConversationHistory(
    conversationId: string,
    limit = 6
  ): Promise<ConversationHistoryMessage[]> {
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

  // ============================================================================
  // Paginated reads
  // ============================================================================

  async getMessages(conversationId: string, take = 100, cursor?: string) {
    const conversation = await this.repo.findConversationExists(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.repo.findMessages(conversationId, take, cursor);
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  async saveUserMessage(conversationId: string, content: string) {
    return this.repo.createMessage({
      conversationId,
      role: MessageRole.USER,
      content,
    });
  }

  /** Maps a RAGResponse into the persistable source/confidence pair. */
  mapRagOutcome(ragResponse: RAGResponse): RagOutcome {
    const confidence = determineConfidence(
      ragResponse.sources.map((s) => ({ relevanceScore: s.score }))
    ) as ConfidenceLevel;
    const sources = ragResponse.sources.map((s) => ({
      chunkId: s.chunkId,
      documentSource: s.documentSource,
      score: s.score,
      excerpt: s.text.slice(0, 200),
    }));
    return { sources, confidence };
  }

  async saveAssistantMessage(
    conversationId: string,
    ragResponse: RAGResponse,
    outcome: RagOutcome,
    latencyMs: number,
    model?: string | null
  ) {
    const tokensIn = ragResponse.metrics?.promptTokens ?? null;
    const tokensOut = ragResponse.metrics?.completionTokens ?? null;
    // Prefer the explicit totalTokens metric, otherwise derive it from the
    // split so the legacy `tokenUsage` column stays consistent.
    const tokenUsage =
      ragResponse.metrics?.totalTokens ??
      (tokensIn !== null || tokensOut !== null ? (tokensIn ?? 0) + (tokensOut ?? 0) : null);
    const cost =
      tokensIn !== null || tokensOut !== null
        ? computeMessageCost({ model, tokensIn, tokensOut })
        : null;

    return this.repo.createMessage({
      conversationId,
      role: MessageRole.ASSISTANT,
      content: ragResponse.answer,
      confidence: outcome.confidence,
      sources: outcome.sources,
      latencyMs,
      tokenUsage,
      tokensIn,
      tokensOut,
      cost,
      model: model ?? null,
    });
  }

  async saveFallbackAssistantMessage(conversationId: string, language: string | null) {
    return this.repo.createMessage({
      conversationId,
      role: MessageRole.ASSISTANT,
      content:
        language === 'en'
          ? "I'm sorry, I couldn't process your question. Please try again."
          : "Je suis désolé, je n'ai pas pu traiter votre question. Veuillez réessayer.",
      confidence: ConfidenceLevel.LOW,
      sources: [],
    });
  }

  // ============================================================================
  // Feedback
  // ============================================================================

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
}
