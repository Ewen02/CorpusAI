import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMTransientError } from '@corpusai/corpus';
import { AnthropicRagLLMClient } from './anthropic-rag-client';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAPIError extends Error {
    status?: number;
    constructor(status?: number, message = 'anthropic error') {
      super(message);
      this.status = status;
    }
  }
  class MockAPIConnectionError extends MockAPIError {
    constructor(message = 'Connection error.') {
      super(undefined, message);
    }
  }
  class MockRateLimitError extends MockAPIError {
    constructor(message = 'Rate limited.') {
      super(429, message);
    }
  }
  class MockInternalServerError extends MockAPIError {
    constructor(message = 'Server error.') {
      super(500, message);
    }
  }
  class MockAuthenticationError extends MockAPIError {
    constructor(message = 'Invalid API key.') {
      super(401, message);
    }
  }

  const MockAnthropic = vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })) as unknown as {
    new (...args: unknown[]): { messages: { create: typeof mockCreate } };
    APIConnectionError: typeof MockAPIConnectionError;
    RateLimitError: typeof MockRateLimitError;
    InternalServerError: typeof MockInternalServerError;
    AuthenticationError: typeof MockAuthenticationError;
  };
  MockAnthropic.APIConnectionError = MockAPIConnectionError;
  MockAnthropic.RateLimitError = MockRateLimitError;
  MockAnthropic.InternalServerError = MockInternalServerError;
  MockAnthropic.AuthenticationError = MockAuthenticationError;

  return { default: MockAnthropic };
});

import Anthropic from '@anthropic-ai/sdk';

/**
 * Les classes d'erreur mockées ont un constructeur sans argument, mais TS voit
 * les signatures du vrai SDK — on instancie via cast.
 */
const makeErr = (ctor: unknown): Error => new (ctor as new () => Error)();

describe('AnthropicRagLLMClient', () => {
  let client: AnthropicRagLLMClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AnthropicRagLLMClient({ apiKey: 'test-key', model: 'claude-haiku-4-5' });
  });

  describe('complete', () => {
    beforeEach(() => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Réponse Claude.' }],
        usage: { input_tokens: 100, output_tokens: 20 },
      });
    });

    it('moves system messages to the top-level system field', async () => {
      await client.complete(
        [
          { role: 'system', content: 'Tu es un assistant.' },
          { role: 'user', content: 'Question ?' },
        ],
        { temperature: 0.2, maxTokens: 500 }
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-haiku-4-5',
          system: 'Tu es un assistant.',
          max_tokens: 500,
          temperature: 0.2,
          messages: [{ role: 'user', content: 'Question ?' }],
        })
      );
    });

    it('maps content blocks and usage to the port shape', async () => {
      const result = await client.complete([{ role: 'user', content: 'Q' }]);

      expect(result.content).toBe('Réponse Claude.');
      expect(result.usage).toEqual({
        promptTokens: 100,
        completionTokens: 20,
        totalTokens: 120,
      });
    });

    it('emulates JSON mode with a system instruction', async () => {
      await client.complete([{ role: 'user', content: 'Décompose...' }], { jsonMode: true });

      const call = mockCreate.mock.calls[0]![0] as { system?: string };
      expect(call.system).toContain('JSON object only');
    });

    it('wraps transient Anthropic errors in LLMTransientError', async () => {
      mockCreate.mockRejectedValue(makeErr(Anthropic.RateLimitError));

      await expect(client.complete([{ role: 'user', content: 'Q' }])).rejects.toBeInstanceOf(
        LLMTransientError
      );
    });

    it('rethrows permanent errors as-is', async () => {
      const authError = makeErr(Anthropic.AuthenticationError);
      mockCreate.mockRejectedValue(authError);

      await expect(client.complete([{ role: 'user', content: 'Q' }])).rejects.toBe(authError);
    });
  });

  describe('stream', () => {
    it('yields text deltas and returns usage from stream events', async () => {
      const events = [
        { type: 'message_start', message: { usage: { input_tokens: 50 } } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Bonjour' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: ' monde' } },
        { type: 'message_delta', usage: { output_tokens: 4 } },
        { type: 'message_stop' },
      ];
      mockCreate.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield* events;
        },
      });

      const generator = await client.stream([{ role: 'user', content: 'Salut' }]);

      const tokens: string[] = [];
      let result: IteratorResult<string, unknown>;
      while (!(result = await generator.next()).done) {
        tokens.push(result.value as string);
      }

      expect(tokens).toEqual(['Bonjour', ' monde']);
      expect(result.value).toEqual({
        promptTokens: 50,
        completionTokens: 4,
        totalTokens: 54,
      });
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ stream: true }));
    });

    it('wraps transient errors at stream creation', async () => {
      mockCreate.mockRejectedValue(makeErr(Anthropic.APIConnectionError));

      await expect(client.stream([{ role: 'user', content: 'Q' }])).rejects.toBeInstanceOf(
        LLMTransientError
      );
    });
  });
});
