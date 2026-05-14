import { Injectable, Logger } from '@nestjs/common';
import { MessageRole } from '@corpusai/database';
import { buildSystemPrompt } from '@corpusai/ai-rules';
import type { RAGResponse } from '@corpusai/corpus';
import { RagService } from '../rag';
import { WebhooksService } from '../webhooks';
import { EndUserMemoryService } from './memory.service';
import { ConversationsRepository } from './conversations.repository';
import { MessageHistoryService } from './message-history.service';

type ConversationWithAI = NonNullable<
  Awaited<ReturnType<ConversationsRepository['findConversationWithAI']>>
>;

export type StreamEvent = {
  type: 'token' | 'sources' | 'done' | 'error';
  data: unknown;
};

const pickMsg = (m: { id: string; role: MessageRole; content: string; createdAt: Date }) =>
  ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt }) as const;

/** Owns the synchronous + streaming RAG flows for a conversation. */
@Injectable()
export class RagOrchestratorService {
  private readonly logger = new Logger(RagOrchestratorService.name);

  constructor(
    private readonly ragService: RagService,
    private readonly webhooksService: WebhooksService,
    private readonly memoryService: EndUserMemoryService,
    private readonly repo: ConversationsRepository,
    private readonly messageHistory: MessageHistoryService
  ) {}

  private async prepareContext(conversation: ConversationWithAI, content: string) {
    const userMessage = await this.messageHistory.saveUserMessage(conversation.id, content);
    const conversationHistory = await this.messageHistory.getConversationHistory(conversation.id);

    let memoryContext: string | undefined;
    if (conversation.ai.memoryEnabled && conversation.endUserId) {
      memoryContext =
        (await this.memoryService.getMemory(conversation.endUserId, conversation.aiId)) ??
        undefined;
    }

    return {
      userMessage,
      llmOptions: {
        model: conversation.ai.llmModel,
        systemPrompt: buildSystemPrompt({
          customPrompt: conversation.ai.systemPrompt ?? undefined,
          language: conversation.ai.language,
          memoryContext,
        }),
        temperature: conversation.ai.temperature,
        maxTokens: conversation.ai.maxTokens,
      },
      queryContext: {
        scoreThreshold: conversation.ai.scoreThreshold ?? 0.4,
        conversationHistory,
      },
    };
  }

  private updateCounters(c: ConversationWithAI, content: string) {
    return this.repo.updateConversationAndQuestionCount(
      c.id,
      c.aiId,
      c.ai.userId,
      c.title,
      content
    );
  }

  private async afterAssistant(c: ConversationWithAI, msgId: string, content: string, ans: string) {
    await this.updateCounters(c, content);

    this.webhooksService
      .emit(c.ai.userId, 'conversation.message.created', {
        messageId: msgId,
        conversationId: c.id,
        aiId: c.aiId,
        role: MessageRole.ASSISTANT,
        content: ans.slice(0, 500),
      })
      .catch(() => {});

    if (c.ai.memoryEnabled && c.endUserId && c.messageCount + 2 >= 4) {
      this.memoryService
        .updateMemory(c.endUserId, c.aiId, c.id)
        .catch((err) => this.logger.warn(`Memory update failed: ${err}`));
    }
  }

  async runSync(conversation: ConversationWithAI, content: string) {
    const { userMessage, llmOptions, queryContext } = await this.prepareContext(
      conversation,
      content
    );
    const startTime = Date.now();

    try {
      const rag = await this.ragService.query(conversation.aiId, content, llmOptions, queryContext);
      const latencyMs = Date.now() - startTime;
      const outcome = this.messageHistory.mapRagOutcome(rag);
      const assistantMessage = await this.messageHistory.saveAssistantMessage(
        conversation.id,
        rag,
        outcome,
        latencyMs,
        conversation.ai.llmModel
      );
      this.logger.log(
        `RAG response for conversation ${conversation.id}: ${rag.sources.length} sources, ${latencyMs}ms, ${rag.metrics?.totalTokens ?? '?'} tokens`
      );
      await this.afterAssistant(conversation, assistantMessage.id, content, rag.answer);
      return { userMessage, assistantMessage, isError: false, errorType: undefined };
    } catch (error) {
      this.logger.error(`RAG query failed: ${error}`);
      const assistantMessage = await this.messageHistory.saveFallbackAssistantMessage(
        conversation.id,
        conversation.ai.language
      );
      await this.updateCounters(conversation, content);
      return { userMessage, assistantMessage, isError: true, errorType: 'rag_failure' as const };
    }
  }

  async *runStream(conversation: ConversationWithAI, content: string): AsyncGenerator<StreamEvent> {
    const { userMessage, llmOptions, queryContext } = await this.prepareContext(
      conversation,
      content
    );
    const startTime = Date.now();

    try {
      const generator = this.ragService.queryStream(
        conversation.aiId,
        content,
        llmOptions,
        queryContext
      );

      let result: IteratorResult<string, RAGResponse>;
      while (!(result = await generator.next()).done) {
        yield { type: 'token', data: { token: result.value } };
      }

      const rag = result.value;
      const latencyMs = Date.now() - startTime;
      const outcome = this.messageHistory.mapRagOutcome(rag);

      yield { type: 'sources', data: { sources: outcome.sources } };

      const assistantMessage = await this.messageHistory.saveAssistantMessage(
        conversation.id,
        rag,
        outcome,
        latencyMs,
        conversation.ai.llmModel
      );
      this.logger.log(
        `RAG stream for conversation ${conversation.id}: ${rag.sources.length} sources, ${latencyMs}ms`
      );
      await this.afterAssistant(conversation, assistantMessage.id, content, rag.answer);

      yield {
        type: 'done',
        data: {
          userMessage: pickMsg(userMessage),
          assistantMessage: {
            ...pickMsg(assistantMessage),
            sources: outcome.sources,
            confidence: outcome.confidence,
            feedback: null,
          },
        },
      };
    } catch (error) {
      this.logger.error(`RAG stream failed: ${error}`);
      const assistantMessage = await this.messageHistory.saveFallbackAssistantMessage(
        conversation.id,
        conversation.ai.language
      );
      yield {
        type: 'error',
        data: {
          message: 'Failed to generate response',
          assistantMessage: {
            ...pickMsg(assistantMessage),
            sources: [],
            confidence: assistantMessage.confidence,
          },
        },
      };
    }
  }
}
