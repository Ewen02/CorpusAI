import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RAG_QUERY_DEFAULTS } from '@corpusai/corpus';
import { RagOrchestratorService } from './rag-orchestrator.service';
import type { RagService } from '../rag';
import type { WebhooksService } from '../webhooks';
import type { EndUserMemoryService } from './memory.service';
import type { ConversationsRepository } from './conversations.repository';
import type { MessageHistoryService } from './message-history.service';
import type { SemanticAnswerCacheService } from '../rag';
import type { TelemetryService } from '../../infrastructure/telemetry';

vi.mock('@corpusai/database', () => ({
  MessageRole: { USER: 'USER', ASSISTANT: 'ASSISTANT' },
}));

vi.mock('@corpusai/ai-rules', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('mocked system prompt'),
}));

type ConversationArg = Parameters<RagOrchestratorService['runSync']>[0];

describe('RagOrchestratorService', () => {
  let service: RagOrchestratorService;
  let callOrder: string[];
  let ragService: { query: ReturnType<typeof vi.fn>; queryStream: ReturnType<typeof vi.fn> };
  let messageHistory: Record<string, ReturnType<typeof vi.fn>>;
  let answerCache: Record<string, ReturnType<typeof vi.fn>>;

  const conversation = {
    id: 'conv-1',
    aiId: 'ai-1',
    title: 'Conversation test',
    messageCount: 0,
    endUserId: null,
    ai: {
      userId: 'user-1',
      llmModel: 'gpt-4o-mini',
      llmProvider: 'openai',
      systemPrompt: null,
      language: 'fr',
      temperature: 0.2,
      maxTokens: 1000,
      scoreThreshold: null,
      memoryEnabled: false,
    },
  } as unknown as ConversationArg;

  beforeEach(() => {
    vi.clearAllMocks();
    callOrder = [];

    messageHistory = {
      getConversationHistory: vi.fn().mockImplementation(async () => {
        callOrder.push('getConversationHistory');
        return [
          { role: 'user', content: 'ancienne question' },
          { role: 'assistant', content: 'ancienne réponse' },
        ];
      }),
      saveUserMessage: vi.fn().mockImplementation(async () => {
        callOrder.push('saveUserMessage');
        return {
          id: 'msg-user',
          role: 'USER',
          content: 'nouvelle question',
          createdAt: new Date(),
        };
      }),
      mapRagOutcome: vi.fn().mockReturnValue({ sources: [], confidence: 'HIGH' }),
      saveAssistantMessage: vi.fn().mockResolvedValue({
        id: 'msg-assistant',
        role: 'ASSISTANT',
        content: 'réponse',
        createdAt: new Date(),
        confidence: 'HIGH',
      }),
      saveFallbackAssistantMessage: vi.fn(),
    };

    ragService = {
      query: vi.fn().mockResolvedValue({
        answer: 'réponse',
        sources: [],
        context: '',
        metrics: { totalTokens: 42 },
      }),
      queryStream: vi.fn(),
    };

    answerCache = {
      lookup: vi.fn().mockResolvedValue(null),
      store: vi.fn().mockResolvedValue(undefined),
      invalidate: vi.fn().mockResolvedValue(undefined),
    };

    service = new RagOrchestratorService(
      ragService as unknown as RagService,
      { emit: vi.fn().mockResolvedValue(undefined) } as unknown as WebhooksService,
      { getMemory: vi.fn(), updateMemory: vi.fn() } as unknown as EndUserMemoryService,
      {
        updateConversationAndQuestionCount: vi.fn().mockResolvedValue(undefined),
      } as unknown as ConversationsRepository,
      messageHistory as unknown as MessageHistoryService,
      answerCache as unknown as SemanticAnswerCacheService,
      { captureRagGeneration: vi.fn() } as unknown as TelemetryService
    );
  });

  it('fetches history BEFORE saving the user message', async () => {
    // Régression : historique lu APRÈS la sauvegarde → la question courante figurait
    // deux fois dans les messages LLM (dernier item d'historique + message user final).
    await service.runSync(conversation, 'nouvelle question');

    expect(callOrder).toEqual(['getConversationHistory', 'saveUserMessage']);
  });

  it('passes the pre-save history to the RAG query (current question excluded)', async () => {
    await service.runSync(conversation, 'nouvelle question');

    const queryContext = ragService.query.mock.calls[0]![3] as {
      conversationHistory: Array<{ role: string; content: string }>;
    };
    expect(queryContext.conversationHistory).toEqual([
      { role: 'user', content: 'ancienne question' },
      { role: 'assistant', content: 'ancienne réponse' },
    ]);
    expect(queryContext.conversationHistory.map((m) => m.content)).not.toContain(
      'nouvelle question'
    );
  });

  it('falls back to RAG_QUERY_DEFAULTS.scoreThreshold when the AI has no custom threshold', async () => {
    await service.runSync(conversation, 'nouvelle question');

    const queryContext = ragService.query.mock.calls[0]![3] as { scoreThreshold: number };
    expect(queryContext.scoreThreshold).toBe(RAG_QUERY_DEFAULTS.scoreThreshold);
  });

  describe('semantic answer cache', () => {
    it('does NOT consult the cache when the conversation has history', async () => {
      await service.runSync(conversation, 'nouvelle question');

      expect(answerCache.lookup).not.toHaveBeenCalled();
    });

    it('serves a cache hit without calling the RAG pipeline (opening question)', async () => {
      messageHistory.getConversationHistory!.mockResolvedValue([]);
      answerCache.lookup!.mockResolvedValue({
        question: 'question equivalente',
        answer: 'réponse en cache',
        sources: [{ chunkId: 'c1', documentSource: 'doc.pdf', score: 0.9, excerpt: '...' }],
        confidence: 'HIGH',
        createdAt: new Date().toISOString(),
      });

      const result = await service.runSync(conversation, 'question équivalente ?');

      expect(ragService.query).not.toHaveBeenCalled();
      expect(result.isError).toBe(false);
      // La réponse cachée est persistée comme message assistant
      const savedRag = messageHistory.saveAssistantMessage!.mock.calls[0]![1] as {
        answer: string;
      };
      expect(savedRag.answer).toBe('réponse en cache');
    });

    it('stores a HIGH confidence answer with sources after a cache miss', async () => {
      messageHistory.getConversationHistory!.mockResolvedValue([]);
      messageHistory.mapRagOutcome!.mockReturnValue({
        sources: [{ chunkId: 'c1', documentSource: 'doc.pdf', score: 0.9, excerpt: '...' }],
        confidence: 'HIGH',
      });

      await service.runSync(conversation, 'première question');

      expect(answerCache.store).toHaveBeenCalledWith(
        'ai-1',
        'première question',
        'réponse',
        expect.any(Array),
        'HIGH'
      );
    });

    it('does NOT store LOW confidence answers', async () => {
      messageHistory.getConversationHistory!.mockResolvedValue([]);
      messageHistory.mapRagOutcome!.mockReturnValue({
        sources: [{ chunkId: 'c1', documentSource: 'doc.pdf', score: 0.2, excerpt: '...' }],
        confidence: 'LOW',
      });

      await service.runSync(conversation, 'question floue');

      expect(answerCache.store).not.toHaveBeenCalled();
    });
  });
});
