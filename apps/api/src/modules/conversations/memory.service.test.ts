import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EndUserMemoryService } from './memory.service';

describe('EndUserMemoryService', () => {
  let service: EndUserMemoryService;

  const mockLlm = {
    chatCompletion: vi.fn(),
  };

  const mockRepo = {
    findSummary: vi.fn(),
    findConversationMessages: vi.fn(),
    upsertSummary: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EndUserMemoryService(mockLlm as any, mockRepo as any);
  });

  describe('getMemory', () => {
    it('delegates to repo.findSummary', async () => {
      mockRepo.findSummary.mockResolvedValue('existing summary');
      const result = await service.getMemory('eu-1', 'ai-1');
      expect(result).toBe('existing summary');
      expect(mockRepo.findSummary).toHaveBeenCalledWith('eu-1', 'ai-1');
    });
  });

  describe('updateMemory', () => {
    it('early returns when fewer than 4 messages', async () => {
      mockRepo.findConversationMessages.mockResolvedValue([
        { role: 'USER', content: 'hi' },
        { role: 'ASSISTANT', content: 'hello' },
      ]);

      await service.updateMemory('eu-1', 'ai-1', 'conv-1');

      expect(mockLlm.chatCompletion).not.toHaveBeenCalled();
      expect(mockRepo.upsertSummary).not.toHaveBeenCalled();
    });

    it('uses "no existing memory" prompt when summary is null', async () => {
      mockRepo.findConversationMessages.mockResolvedValue([
        { role: 'USER', content: 'q1' },
        { role: 'ASSISTANT', content: 'a1' },
        { role: 'USER', content: 'q2' },
        { role: 'ASSISTANT', content: 'a2' },
      ]);
      mockRepo.findSummary.mockResolvedValue(null);
      mockLlm.chatCompletion.mockResolvedValue({ content: 'new summary' });

      await service.updateMemory('eu-1', 'ai-1', 'conv-1');

      const call = mockLlm.chatCompletion.mock.calls[0]![0];
      expect(call.messages[0].content).not.toContain('EXISTING MEMORY');
      expect(call.messages[0].content).toContain('Summarize the key points');
    });

    it('includes existing memory in prompt when present', async () => {
      mockRepo.findConversationMessages.mockResolvedValue([
        { role: 'USER', content: 'q1' },
        { role: 'ASSISTANT', content: 'a1' },
        { role: 'USER', content: 'q2' },
        { role: 'ASSISTANT', content: 'a2' },
      ]);
      mockRepo.findSummary.mockResolvedValue('prior summary');
      mockLlm.chatCompletion.mockResolvedValue({ content: 'updated summary' });

      await service.updateMemory('eu-1', 'ai-1', 'conv-1');

      const systemPrompt = mockLlm.chatCompletion.mock.calls[0]![0].messages[0].content;
      expect(systemPrompt).toContain('EXISTING MEMORY');
      expect(systemPrompt).toContain('prior summary');
    });

    it('calls LLM with correct params (temperature, maxTokens)', async () => {
      mockRepo.findConversationMessages.mockResolvedValue([
        { role: 'USER', content: 'q1' },
        { role: 'ASSISTANT', content: 'a1' },
        { role: 'USER', content: 'q2' },
        { role: 'ASSISTANT', content: 'a2' },
      ]);
      mockRepo.findSummary.mockResolvedValue(null);
      mockLlm.chatCompletion.mockResolvedValue({ content: 'summary' });

      await service.updateMemory('eu-1', 'ai-1', 'conv-1');

      expect(mockLlm.chatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
          maxTokens: 600,
        })
      );
    });

    it('skips upsert when LLM returns empty content', async () => {
      mockRepo.findConversationMessages.mockResolvedValue([
        { role: 'USER', content: 'q1' },
        { role: 'ASSISTANT', content: 'a1' },
        { role: 'USER', content: 'q2' },
        { role: 'ASSISTANT', content: 'a2' },
      ]);
      mockRepo.findSummary.mockResolvedValue(null);
      mockLlm.chatCompletion.mockResolvedValue({ content: '   ' });

      await service.updateMemory('eu-1', 'ai-1', 'conv-1');

      expect(mockRepo.upsertSummary).not.toHaveBeenCalled();
    });

    it('upserts trimmed summary', async () => {
      mockRepo.findConversationMessages.mockResolvedValue([
        { role: 'USER', content: 'q1' },
        { role: 'ASSISTANT', content: 'a1' },
        { role: 'USER', content: 'q2' },
        { role: 'ASSISTANT', content: 'a2' },
      ]);
      mockRepo.findSummary.mockResolvedValue(null);
      mockLlm.chatCompletion.mockResolvedValue({ content: '  final summary  ' });

      await service.updateMemory('eu-1', 'ai-1', 'conv-1');

      expect(mockRepo.upsertSummary).toHaveBeenCalledWith('eu-1', 'ai-1', 'final summary');
    });

    it('swallows LLM errors without throwing', async () => {
      mockRepo.findConversationMessages.mockResolvedValue([
        { role: 'USER', content: 'q1' },
        { role: 'ASSISTANT', content: 'a1' },
        { role: 'USER', content: 'q2' },
        { role: 'ASSISTANT', content: 'a2' },
      ]);
      mockRepo.findSummary.mockResolvedValue(null);
      mockLlm.chatCompletion.mockRejectedValue(new Error('LLM down'));

      await expect(service.updateMemory('eu-1', 'ai-1', 'conv-1')).resolves.toBeUndefined();
      expect(mockRepo.upsertSummary).not.toHaveBeenCalled();
    });
  });
});
