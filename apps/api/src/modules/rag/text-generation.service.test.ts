import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TextGenerationService } from './text-generation.service';

describe('TextGenerationService', () => {
  let service: TextGenerationService;
  const mockLlm = { chatCompletion: vi.fn() };
  const mockRepo = { findIndexedChunks: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TextGenerationService(mockLlm as any, mockRepo as any);
  });

  it('throws BadRequestException when no indexed chunks exist', async () => {
    mockRepo.findIndexedChunks.mockResolvedValue([]);
    await expect(service.generateAISuggestions({ aiId: 'ai-1', aiName: 'Bot' })).rejects.toThrow(
      BadRequestException
    );
  });

  it('defaults to French prompt', async () => {
    mockRepo.findIndexedChunks.mockResolvedValue([{ content: 'doc' }]);
    mockLlm.chatCompletion.mockResolvedValue({
      content: JSON.stringify({ description: 'd', systemPrompt: 's', welcomeMessage: 'w' }),
    });

    await service.generateAISuggestions({ aiId: 'ai-1', aiName: 'Bot' });

    const prompt = mockLlm.chatCompletion.mock.calls[0]![0].messages[0].content;
    expect(prompt).toContain('in French');
  });

  it('uses English when language=en', async () => {
    mockRepo.findIndexedChunks.mockResolvedValue([{ content: 'doc' }]);
    mockLlm.chatCompletion.mockResolvedValue({
      content: JSON.stringify({ description: 'd', systemPrompt: 's', welcomeMessage: 'w' }),
    });

    await service.generateAISuggestions({ aiId: 'ai-1', aiName: 'Bot', language: 'en' });

    const prompt = mockLlm.chatCompletion.mock.calls[0]![0].messages[0].content;
    expect(prompt).toContain('in English');
  });

  it('parses JSON response and returns sliced fields', async () => {
    mockRepo.findIndexedChunks.mockResolvedValue([{ content: 'hello world' }]);
    mockLlm.chatCompletion.mockResolvedValue({
      content: JSON.stringify({
        description: 'Desc',
        systemPrompt: 'Prompt',
        welcomeMessage: 'Welcome',
      }),
    });

    const result = await service.generateAISuggestions({ aiId: 'ai-1', aiName: 'Bot' });

    expect(result).toEqual({
      description: 'Desc',
      systemPrompt: 'Prompt',
      welcomeMessage: 'Welcome',
    });
  });

  it('returns empty fields when LLM content is null', async () => {
    mockRepo.findIndexedChunks.mockResolvedValue([{ content: 'doc' }]);
    mockLlm.chatCompletion.mockResolvedValue({ content: null });

    const result = await service.generateAISuggestions({ aiId: 'ai-1', aiName: 'Bot' });

    expect(result).toEqual({ description: '', systemPrompt: '', welcomeMessage: '' });
  });

  it('defensively handles missing fields in JSON response', async () => {
    mockRepo.findIndexedChunks.mockResolvedValue([{ content: 'doc' }]);
    mockLlm.chatCompletion.mockResolvedValue({
      content: JSON.stringify({ description: 'only desc' }),
    });

    const result = await service.generateAISuggestions({ aiId: 'ai-1', aiName: 'Bot' });

    expect(result.description).toBe('only desc');
    expect(result.systemPrompt).toBe('');
    expect(result.welcomeMessage).toBe('');
  });
});
