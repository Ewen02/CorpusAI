import { Injectable, Logger } from '@nestjs/common';
import { MessageRole, type ConfidenceLevel } from '@corpusai/database';
import { buildSystemPrompt } from '@corpusai/ai-rules';
import { RAG_QUERY_DEFAULTS, type RAGResponse } from '@corpusai/corpus';
import { RagService, SemanticAnswerCacheService } from '../rag';
import { WebhooksService } from '../webhooks';
import { TelemetryService } from '../../infrastructure/telemetry';
import { EndUserMemoryService } from './memory.service';
import { ConversationsRepository } from './conversations.repository';
import {
  MessageHistoryService,
  type MessageSource,
  type RagOutcome,
} from './message-history.service';

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
    private readonly messageHistory: MessageHistoryService,
    private readonly answerCache: SemanticAnswerCacheService,
    private readonly telemetry: TelemetryService
  ) {}

  private async prepareContext(conversation: ConversationWithAI, content: string) {
    // Historique AVANT la sauvegarde du message courant : sinon la question apparaît
    // deux fois dans les messages LLM (dernier item d'historique + message user final
    // ajouté par le pipeline) — tokens gaspillés et un slot d'historique perdu sur 6.
    const conversationHistory = await this.messageHistory.getConversationHistory(conversation.id);
    const userMessage = await this.messageHistory.saveUserMessage(conversation.id, content);

    let memoryContext: string | undefined;
    if (conversation.ai.memoryEnabled && conversation.endUserId) {
      memoryContext =
        (await this.memoryService.getMemory(conversation.endUserId, conversation.aiId)) ??
        undefined;
    }

    return {
      userMessage,
      // Le cache sémantique n'est éligible que pour une question d'ouverture
      // impersonnelle : les follow-ups dépendent de l'historique, et une
      // mémoire end-user active rend les réponses personnalisées.
      cacheEligible: conversationHistory.length === 0 && !memoryContext,
      llmOptions: {
        model: conversation.ai.llmModel,
        // `llmProvider` selects between openai / anthropic / groq adapters.
        // Falls back to "openai" in the factory when the corresponding API
        // key is missing or the provider is unknown.
        provider: conversation.ai.llmProvider as 'openai' | 'anthropic' | 'groq',
        systemPrompt: buildSystemPrompt({
          customPrompt: conversation.ai.systemPrompt ?? undefined,
          language: conversation.ai.language,
          memoryContext,
        }),
        temperature: conversation.ai.temperature,
        maxTokens: conversation.ai.maxTokens,
      },
      queryContext: {
        scoreThreshold: conversation.ai.scoreThreshold ?? RAG_QUERY_DEFAULTS.scoreThreshold,
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
      .catch((err) => this.logger.warn(`webhook emit failed: ${err}`));

    if (c.ai.memoryEnabled && c.endUserId && c.messageCount + 2 >= 4) {
      this.memoryService
        .updateMemory(c.endUserId, c.aiId, c.id)
        .catch((err) => this.logger.warn(`Memory update failed: ${err}`));
    }
  }

  /**
   * Tente de servir la réponse depuis le cache sémantique.
   * Retourne le message assistant persisté sur hit, null sur miss.
   */
  private async tryServeFromCache(conversation: ConversationWithAI, content: string) {
    const cached = await this.answerCache.lookup(conversation.aiId, content);
    if (!cached) return null;

    const outcome: RagOutcome = {
      sources: cached.sources as MessageSource[],
      confidence: cached.confidence as ConfidenceLevel,
    };
    // Pas d'appel LLM : tokens/coût nuls, seul le temps de lookup est facturé
    const syntheticRag: RAGResponse = {
      answer: cached.answer,
      sources: [],
      context: '',
    };
    return { cached, outcome, syntheticRag };
  }

  /** Met la réponse en cache si elle est fiable (HIGH confidence + sources). */
  private storeInCacheIfReliable(
    conversation: ConversationWithAI,
    content: string,
    answer: string,
    outcome: RagOutcome
  ): void {
    if (outcome.confidence !== 'HIGH' || outcome.sources.length === 0) return;
    void this.answerCache.store(
      conversation.aiId,
      content,
      answer,
      outcome.sources,
      outcome.confidence
    );
  }

  private captureTelemetry(
    conversation: ConversationWithAI,
    outcome: RagOutcome | null,
    latencyMs: number,
    rag?: RAGResponse,
    flags?: { cacheHit?: boolean; isError?: boolean }
  ): void {
    this.telemetry.captureRagGeneration({
      aiId: conversation.aiId,
      conversationId: conversation.id,
      endUserId: conversation.endUserId,
      model: conversation.ai.llmModel,
      confidence: outcome?.confidence ?? null,
      sourcesCount: outcome?.sources.length ?? 0,
      latencyMs,
      tokensIn: rag?.metrics?.promptTokens ?? null,
      tokensOut: rag?.metrics?.completionTokens ?? null,
      metrics: rag?.metrics as Record<string, number | undefined> | undefined,
      cacheHit: flags?.cacheHit ?? false,
      isError: flags?.isError ?? false,
    });
  }

  async runSync(conversation: ConversationWithAI, content: string) {
    const { userMessage, llmOptions, queryContext, cacheEligible } = await this.prepareContext(
      conversation,
      content
    );
    const startTime = Date.now();

    // Cache sémantique : question d'ouverture déjà répondue → réponse immédiate
    if (cacheEligible) {
      const hit = await this.tryServeFromCache(conversation, content);
      if (hit) {
        const latencyMs = Date.now() - startTime;
        const assistantMessage = await this.messageHistory.saveAssistantMessage(
          conversation.id,
          hit.syntheticRag,
          hit.outcome,
          latencyMs,
          conversation.ai.llmModel
        );
        this.logger.log(
          `Semantic cache hit for conversation ${conversation.id} (${latencyMs}ms, no LLM call)`
        );
        await this.afterAssistant(conversation, assistantMessage.id, content, hit.cached.answer);
        this.captureTelemetry(conversation, hit.outcome, latencyMs, undefined, { cacheHit: true });
        return { userMessage, assistantMessage, isError: false, errorType: undefined };
      }
    }

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
      if (cacheEligible) {
        this.storeInCacheIfReliable(conversation, content, rag.answer, outcome);
      }
      this.captureTelemetry(conversation, outcome, latencyMs, rag);
      return { userMessage, assistantMessage, isError: false, errorType: undefined };
    } catch (error) {
      this.logger.error(`RAG query failed: ${error}`);
      const assistantMessage = await this.messageHistory.saveFallbackAssistantMessage(
        conversation.id,
        conversation.ai.language
      );
      await this.updateCounters(conversation, content);
      this.captureTelemetry(conversation, null, Date.now() - startTime, undefined, {
        isError: true,
      });
      return { userMessage, assistantMessage, isError: true, errorType: 'rag_failure' as const };
    }
  }

  async *runStream(conversation: ConversationWithAI, content: string): AsyncGenerator<StreamEvent> {
    const { userMessage, llmOptions, queryContext, cacheEligible } = await this.prepareContext(
      conversation,
      content
    );
    const startTime = Date.now();

    // Cache sémantique : la réponse complète est servie en un seul token
    if (cacheEligible) {
      const hit = await this.tryServeFromCache(conversation, content);
      if (hit) {
        const latencyMs = Date.now() - startTime;
        yield { type: 'token', data: { token: hit.cached.answer } };
        yield { type: 'sources', data: { sources: hit.outcome.sources } };

        const assistantMessage = await this.messageHistory.saveAssistantMessage(
          conversation.id,
          hit.syntheticRag,
          hit.outcome,
          latencyMs,
          conversation.ai.llmModel
        );
        this.logger.log(
          `Semantic cache hit (stream) for conversation ${conversation.id} (${latencyMs}ms)`
        );
        await this.afterAssistant(conversation, assistantMessage.id, content, hit.cached.answer);
        this.captureTelemetry(conversation, hit.outcome, latencyMs, undefined, { cacheHit: true });

        yield {
          type: 'done',
          data: {
            userMessage: pickMsg(userMessage),
            assistantMessage: {
              ...pickMsg(assistantMessage),
              sources: hit.outcome.sources,
              confidence: hit.outcome.confidence,
              feedback: null,
            },
          },
        };
        return;
      }
    }

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
      if (cacheEligible) {
        this.storeInCacheIfReliable(conversation, content, rag.answer, outcome);
      }
      this.captureTelemetry(conversation, outcome, latencyMs, rag);

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
      this.captureTelemetry(conversation, null, Date.now() - startTime, undefined, {
        isError: true,
      });
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
