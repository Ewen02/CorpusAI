import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MessageHistoryService } from './message-history.service';

vi.mock('@corpusai/database', () => ({
  MessageRole: { USER: 'USER', ASSISTANT: 'ASSISTANT' },
  ConfidenceLevel: { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' },
}));

vi.mock('@corpusai/ai-rules', () => ({
  determineConfidence: vi.fn().mockReturnValue('HIGH'),
}));

describe('MessageHistoryService', () => {
  let service: MessageHistoryService;
  const mockRepo = {
    findConversationHistory: vi.fn(),
    findConversationExists: vi.fn(),
    findMessages: vi.fn(),
    createMessage: vi.fn((data: unknown) => ({ id: 'm', ...(data as object) })),
    findMessageForFeedback: vi.fn(),
    updateMessageFeedback: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MessageHistoryService(mockRepo as any);
    mockRepo.createMessage.mockImplementation((data: unknown) => ({
      id: 'm',
      ...(data as object),
    }));
  });

  describe('getConversationHistory', () => {
    it('reverses and filters to user/assistant only', async () => {
      mockRepo.findConversationHistory.mockResolvedValue([
        { role: 'ASSISTANT', content: 'b' },
        { role: 'USER', content: 'a' },
      ]);

      const result = await service.getConversationHistory('conv-1');
      expect(result).toEqual([
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
      ]);
    });

    it('filters out non user/assistant roles', async () => {
      mockRepo.findConversationHistory.mockResolvedValue([
        { role: 'SYSTEM', content: 'sys' },
        { role: 'USER', content: 'a' },
      ]);

      const result = await service.getConversationHistory('conv-1');
      expect(result).toEqual([{ role: 'user', content: 'a' }]);
    });
  });

  describe('getMessages', () => {
    it('returns messages when conversation exists', async () => {
      mockRepo.findConversationExists.mockResolvedValue({ id: 'conv-1' });
      mockRepo.findMessages.mockResolvedValue([{ id: 'm1' }]);

      const result = await service.getMessages('conv-1');
      expect(result).toEqual([{ id: 'm1' }]);
    });

    it('throws NotFoundException when conversation missing', async () => {
      mockRepo.findConversationExists.mockResolvedValue(null);
      await expect(service.getMessages('conv-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveUserMessage', () => {
    it('creates a USER message', async () => {
      const result = await service.saveUserMessage('conv-1', 'hi');
      expect(mockRepo.createMessage).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        role: 'USER',
        content: 'hi',
      });
      expect(result.id).toBe('m');
    });
  });

  describe('mapRagOutcome', () => {
    it('truncates source text to 200 chars and maps shape', () => {
      const longText = 'x'.repeat(500);
      const outcome = service.mapRagOutcome({
        answer: 'ans',
        sources: [{ chunkId: 'c1', documentSource: 'doc.pdf', score: 0.9, text: longText }],
        metrics: { totalTokens: 100 },
      } as any);

      expect(outcome.confidence).toBe('HIGH');
      expect(outcome.sources).toEqual([
        { chunkId: 'c1', documentSource: 'doc.pdf', score: 0.9, excerpt: 'x'.repeat(200) },
      ]);
    });
  });

  describe('saveAssistantMessage', () => {
    it('persists with confidence, sources, latency, tokenUsage, cost split', async () => {
      await service.saveAssistantMessage(
        'conv-1',
        {
          answer: 'response',
          sources: [],
          metrics: { totalTokens: 42, promptTokens: 30, completionTokens: 12 },
        } as any,
        { sources: [], confidence: 'HIGH' as any },
        150,
        'gpt-4o-mini'
      );

      expect(mockRepo.createMessage).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        role: 'ASSISTANT',
        content: 'response',
        confidence: 'HIGH',
        sources: [],
        latencyMs: 150,
        tokenUsage: 42,
        tokensIn: 30,
        tokensOut: 12,
        // 30 prompt * $0.15/M + 12 completion * $0.60/M ≈ 0.0000117 → rounds to 0
        cost: 0,
        model: 'gpt-4o-mini',
      });
    });

    it('persists null token fields and null cost when metrics missing', async () => {
      await service.saveAssistantMessage(
        'conv-1',
        { answer: 'r', sources: [], metrics: undefined } as any,
        { sources: [], confidence: 'LOW' as any },
        0
      );
      expect(mockRepo.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenUsage: null,
          tokensIn: null,
          tokensOut: null,
          cost: null,
          model: null,
        })
      );
    });

    it('derives tokenUsage from the split when totalTokens is missing', async () => {
      await service.saveAssistantMessage(
        'conv-1',
        { answer: 'r', sources: [], metrics: { promptTokens: 1000, completionTokens: 500 } } as any,
        { sources: [], confidence: 'HIGH' as any },
        10,
        'gpt-4o'
      );
      // 1000 in @ $2.50/M + 500 out @ $10/M = 0.0025 + 0.005 = 0.0075
      expect(mockRepo.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenUsage: 1500,
          tokensIn: 1000,
          tokensOut: 500,
          cost: 0.0075,
          model: 'gpt-4o',
        })
      );
    });
  });

  describe('saveFallbackAssistantMessage', () => {
    it('uses English message when language=en', async () => {
      await service.saveFallbackAssistantMessage('conv-1', 'en');
      expect(mockRepo.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "I'm sorry, I couldn't process your question. Please try again.",
          confidence: 'LOW',
          sources: [],
        })
      );
    });

    it('uses French message when language=null', async () => {
      await service.saveFallbackAssistantMessage('conv-1', null);
      expect(mockRepo.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Je suis désolé, je n'ai pas pu traiter votre question. Veuillez réessayer.",
        })
      );
    });
  });

  describe('updateMessageFeedback', () => {
    it('updates feedback on assistant message', async () => {
      mockRepo.findMessageForFeedback.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'ASSISTANT',
      });

      const result = await service.updateMessageFeedback('conv-1', 'msg-1', 'positive');
      expect(result).toEqual({ id: 'msg-1', feedback: 'positive' });
      expect(mockRepo.updateMessageFeedback).toHaveBeenCalledWith('msg-1', 'positive');
    });

    it('throws NotFoundException when message missing', async () => {
      mockRepo.findMessageForFeedback.mockResolvedValue(null);
      await expect(service.updateMessageFeedback('conv-1', 'msg-1', 'positive')).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws NotFoundException when conversationId mismatches', async () => {
      mockRepo.findMessageForFeedback.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'other',
        role: 'ASSISTANT',
      });
      await expect(service.updateMessageFeedback('conv-1', 'msg-1', 'positive')).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws BadRequestException when role is USER', async () => {
      mockRepo.findMessageForFeedback.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'USER',
      });
      await expect(service.updateMessageFeedback('conv-1', 'msg-1', 'positive')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
