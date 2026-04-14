import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

import { OpenAILLMAdapter } from './openai.adapter';
import OpenAI from 'openai';

const makeConfig = (env: Record<string, string | undefined>) => ({
  get: vi.fn((key: string) => env[key]),
});

describe('OpenAILLMAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers LLM_API_KEY over OPENAI_API_KEY', () => {
    new OpenAILLMAdapter(
      makeConfig({ LLM_API_KEY: 'llm-key', OPENAI_API_KEY: 'openai-key' }) as any
    );
    expect(OpenAI).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'llm-key' }));
  });

  it('falls back to OPENAI_API_KEY when LLM_API_KEY missing', () => {
    new OpenAILLMAdapter(makeConfig({ OPENAI_API_KEY: 'openai-key' }) as any);
    expect(OpenAI).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'openai-key' }));
  });

  it('uses default model gpt-4o-mini when LLM_MODEL not set', async () => {
    const adapter = new OpenAILLMAdapter(makeConfig({ OPENAI_API_KEY: 'k' }) as any);
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'hi' } }] });

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o-mini' }));
  });

  it('overrides model with LLM_MODEL config', async () => {
    const adapter = new OpenAILLMAdapter(
      makeConfig({ OPENAI_API_KEY: 'k', LLM_MODEL: 'gpt-4-turbo' }) as any
    );
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'hi' } }] });

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4-turbo' }));
  });

  it('omits optional params when undefined', async () => {
    const adapter = new OpenAILLMAdapter(makeConfig({ OPENAI_API_KEY: 'k' }) as any);
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'hi' } }] });

    await adapter.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] });

    const call = mockCreate.mock.calls[0]![0];
    expect(call).not.toHaveProperty('temperature');
    expect(call).not.toHaveProperty('max_tokens');
    expect(call).not.toHaveProperty('response_format');
  });

  it('passes optional params when provided', async () => {
    const adapter = new OpenAILLMAdapter(makeConfig({ OPENAI_API_KEY: 'k' }) as any);
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'hi' } }] });

    await adapter.chatCompletion({
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.5,
      maxTokens: 100,
      responseFormat: { type: 'json_object' },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.5,
        max_tokens: 100,
        response_format: { type: 'json_object' },
      })
    );
  });

  it('returns content and usage from response', async () => {
    const adapter = new OpenAILLMAdapter(makeConfig({ OPENAI_API_KEY: 'k' }) as any);
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'response text' } }],
      usage: { total_tokens: 42 },
    });

    const result = await adapter.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] });

    expect(result.content).toBe('response text');
    expect(result.usage).toEqual({ totalTokens: 42 });
  });

  it('returns empty content when message content is null', async () => {
    const adapter = new OpenAILLMAdapter(makeConfig({ OPENAI_API_KEY: 'k' }) as any);
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });

    const result = await adapter.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] });
    expect(result.content).toBe('');
  });
});
