import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { AccessControlService } from './access-control.service';
import { MessageHistoryService } from './message-history.service';
import { RagOrchestratorService } from './rag-orchestrator.service';

vi.mock('@corpusai/database', () => ({
  prisma: {
    aI: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    conversation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    endUser: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ count: BigInt(0) }]),
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        conversation: {
          create: vi
            .fn()
            .mockResolvedValue({ id: 'conv-1', aiId: 'ai-1', ai: { id: 'ai-1', name: 'Test' } }),
          update: vi.fn(),
        },
        aI: { update: vi.fn() },
        dailyStats: { upsert: vi.fn() },
      })
    ),
  },
  MessageRole: { USER: 'USER', ASSISTANT: 'ASSISTANT' },
  AIStatus: { ACTIVE: 'ACTIVE', DRAFT: 'DRAFT' },
  ConfidenceLevel: { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' },
}));

vi.mock('@corpusai/subscription', () => ({
  canAskQuestion: vi.fn().mockReturnValue(true),
}));

vi.mock('@corpusai/ai-rules', () => ({
  determineConfidence: vi.fn().mockReturnValue('HIGH'),
  buildSystemPrompt: vi.fn().mockReturnValue('mocked system prompt'),
}));

vi.mock('../../shared/daily-stats', () => ({
  incrementDailyStats: vi.fn(),
}));

import { prisma } from '@corpusai/database';
import { canAskQuestion } from '@corpusai/subscription';

const mockAI = prisma.aI as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
};
const mockConversation = prisma.conversation as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};
const mockMessage = prisma.message as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

describe('ConversationsService', () => {
  let service: ConversationsService;
  const mockRagService = {
    query: vi.fn(),
    queryStream: vi.fn(),
  };
  const mockWebhooksService = { emit: vi.fn().mockResolvedValue(undefined) };
  const mockMemoryService = {
    getMemory: vi.fn().mockResolvedValue(null),
    updateMemory: vi.fn().mockResolvedValue(undefined),
  };

  // Mock repository delegating to prisma mocks
  const mockRepo = {
    findAccessGrant: vi.fn(),
    getTodayQuestionCount: vi.fn().mockResolvedValue(0),
    findConversationHistory: vi.fn().mockResolvedValue([]),
    findAIPublicInfo: vi.fn((...args: unknown[]) =>
      mockAI.findFirst({ where: { slug: args[1], user: { username: args[0] } } })
    ),
    findAIByIdAndUser: vi.fn((...args: unknown[]) =>
      mockAI.findFirst({ where: { id: args[0], userId: args[1] } })
    ),
    findConversationsByAI: vi.fn((...args: unknown[]) =>
      mockConversation.findMany({ where: { aiId: args[0] } })
    ),
    findConversationWithMessages: vi.fn((...args: unknown[]) =>
      mockConversation.findUnique({ where: { id: args[0] } })
    ),
    findConversationExists: vi.fn((...args: unknown[]) =>
      mockConversation.findUnique({ where: { id: args[0] } })
    ),
    findMessages: vi.fn(),
    findAIBySlugAndUsername: vi.fn(),
    findEndUserBySession: vi.fn(),
    createConversationWithCounterUpdate: vi.fn(),
    findConversationWithAI: vi.fn((...args: unknown[]) =>
      mockConversation.findUnique({ where: { id: args[0] } })
    ),
    createMessage: vi.fn((...args: unknown[]) => mockMessage.create(args[0])),
    updateConversationAndQuestionCount: vi.fn().mockResolvedValue(undefined),
    findMessageForFeedback: vi.fn(),
    updateMessageFeedback: vi.fn(),
    findConversationForDelete: vi.fn((...args: unknown[]) =>
      mockConversation.findUnique({ where: { id: args[0] } })
    ),
    deleteConversationWithCounterUpdate: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    const accessControlService = new AccessControlService(mockRepo as any);
    const messageHistoryService = new MessageHistoryService(mockRepo as any);
    const ragOrchestrator = new RagOrchestratorService(
      mockRagService as any,
      mockWebhooksService as any,
      mockMemoryService as any,
      mockRepo as any,
      messageHistoryService,
      {
        lookup: vi.fn().mockResolvedValue(null),
        store: vi.fn().mockResolvedValue(undefined),
        invalidate: vi.fn().mockResolvedValue(undefined),
      } as any,
      { captureRagGeneration: vi.fn() } as any
    );
    service = new ConversationsService(
      mockWebhooksService as any,
      mockRepo as any,
      accessControlService,
      messageHistoryService,
      ragOrchestrator
    );
    vi.clearAllMocks();
    (canAskQuestion as ReturnType<typeof vi.fn>).mockReturnValue(true);

    // Re-apply delegates after clearAllMocks
    mockRepo.getTodayQuestionCount.mockResolvedValue(0);
    mockRepo.findConversationHistory.mockResolvedValue([]);
    mockRepo.findAIPublicInfo.mockImplementation((...args: unknown[]) =>
      mockAI.findFirst({ where: { slug: args[1], user: { username: args[0] } } })
    );
    mockRepo.findAIByIdAndUser.mockImplementation((...args: unknown[]) =>
      mockAI.findFirst({ where: { id: args[0], userId: args[1] } })
    );
    mockRepo.findConversationsByAI.mockImplementation((...args: unknown[]) =>
      mockConversation.findMany({ where: { aiId: args[0] } })
    );
    mockRepo.findConversationWithMessages.mockImplementation((...args: unknown[]) =>
      mockConversation.findUnique({ where: { id: args[0] } })
    );
    mockRepo.findConversationExists.mockImplementation((...args: unknown[]) =>
      mockConversation.findUnique({ where: { id: args[0] } })
    );
    mockRepo.findConversationWithAI.mockImplementation((...args: unknown[]) =>
      mockConversation.findUnique({ where: { id: args[0] } })
    );
    mockRepo.createMessage.mockImplementation((...args: unknown[]) => mockMessage.create(args[0]));
    mockRepo.updateConversationAndQuestionCount.mockResolvedValue(undefined);
    mockRepo.findConversationForDelete.mockImplementation((...args: unknown[]) =>
      mockConversation.findUnique({ where: { id: args[0] } })
    );
    mockRepo.deleteConversationWithCounterUpdate.mockResolvedValue(undefined);
  });

  describe('getAIPublicInfo', () => {
    it('should return public AI info with avatar alias', async () => {
      mockAI.findFirst.mockResolvedValue({
        id: 'ai-1',
        slug: 'test-ai',
        name: 'Test AI',
        description: 'desc',
        welcomeMessage: 'Hello',
        primaryColor: '#3b82f6',
        logo: 'logo.png',
        status: 'ACTIVE',
        isPublic: true,
        accessType: 'FREE',
      });

      const result = await service.getAIPublicInfo('jean', 'test-ai');
      expect(result.avatar).toBe('logo.png');
      expect(result.id).toBe('ai-1');
    });

    it('should throw when AI not found', async () => {
      mockAI.findFirst.mockResolvedValue(null);
      await expect(service.getAIPublicInfo('jean', 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByAI', () => {
    it('should return conversations for owned AI', async () => {
      mockAI.findFirst.mockResolvedValue({ id: 'ai-1' });
      const convos = [{ id: 'conv-1', title: 'Test' }];
      mockConversation.findMany.mockResolvedValue(convos);

      const result = await service.findAllByAI('user-1', 'ai-1');
      expect(result).toBe(convos);
    });

    it('should throw when AI not owned', async () => {
      mockAI.findFirst.mockResolvedValue(null);
      await expect(service.findAllByAI('user-1', 'ai-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return conversation with messages', async () => {
      const conv = {
        id: 'conv-1',
        messages: [
          { id: 'm1', role: 'USER', content: 'hi', createdAt: new Date() },
          { id: 'm2', role: 'ASSISTANT', content: 'hello', createdAt: new Date() },
        ],
        ai: { id: 'ai-1', name: 'Test' },
      };
      mockConversation.findUnique.mockResolvedValue(conv);

      const result = await service.findOne('conv-1');
      expect(result.id).toBe('conv-1');
    });

    it('should throw when conversation not found', async () => {
      mockConversation.findUnique.mockResolvedValue(null);
      await expect(service.findOne('conv-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendMessage', () => {
    const conversation = {
      id: 'conv-1',
      aiId: 'ai-1',
      title: null,
      endUserId: null,
      messageCount: 0,
      ai: {
        id: 'ai-1',
        userId: 'user-1',
        systemPrompt: 'You are helpful',
        language: null,
        temperature: 0.7,
        maxTokens: 1024,
        scoreThreshold: 0.6,
        llmModel: null,
        memoryEnabled: false,
        user: { subscriptionPlan: 'FREE' },
      },
    };

    it('should save user message and RAG response', async () => {
      mockConversation.findUnique.mockResolvedValue(conversation);
      mockMessage.create
        .mockResolvedValueOnce({ id: 'msg-user', role: 'USER', content: 'hello' })
        .mockResolvedValueOnce({ id: 'msg-assistant', role: 'ASSISTANT', content: 'response' });

      mockRagService.query.mockResolvedValue({
        answer: 'response',
        sources: [{ chunkId: 'c1', documentSource: 'doc.pdf', score: 0.9, text: 'excerpt' }],
        metrics: { totalTokens: 150 },
      });

      const result = await service.sendMessage('conv-1', 'hello');
      expect(result.isError).toBe(false);
      expect(mockRepo.createMessage).toHaveBeenCalledTimes(2);
    });

    it('should throw when conversation not found', async () => {
      mockConversation.findUnique.mockResolvedValue(null);
      await expect(service.sendMessage('conv-1', 'hello')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when daily limit reached', async () => {
      mockConversation.findUnique.mockResolvedValue(conversation);
      mockRepo.getTodayQuestionCount.mockResolvedValue(100);
      (canAskQuestion as ReturnType<typeof vi.fn>).mockReturnValue(false);

      await expect(service.sendMessage('conv-1', 'hello')).rejects.toThrow(ForbiddenException);
    });

    it('should return fallback response on RAG error', async () => {
      mockConversation.findUnique.mockResolvedValue(conversation);
      mockMessage.create.mockResolvedValue({ id: 'msg', role: 'ASSISTANT', content: 'fallback' });
      mockRagService.query.mockRejectedValue(new Error('OpenAI down'));

      const result = await service.sendMessage('conv-1', 'hello');
      expect(result.isError).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete owned conversation', async () => {
      mockConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        ai: { id: 'ai-1', userId: 'user-1' },
      });

      const result = await service.delete('user-1', 'conv-1');
      expect(result).toEqual({ success: true });
    });

    it('should throw when conversation not owned', async () => {
      mockConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        ai: { id: 'ai-1', userId: 'other' },
      });

      await expect(service.delete('user-1', 'conv-1')).rejects.toThrow(NotFoundException);
    });
  });
});
