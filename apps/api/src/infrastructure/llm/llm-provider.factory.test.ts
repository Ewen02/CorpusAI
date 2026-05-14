import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the SDKs *before* importing the adapters so the constructors don't
// hit the network or require real API keys.
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: vi.fn() } },
  })),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

import {
  LLMProviderFactory,
  MODELS_BY_PROVIDER,
  SUPPORTED_LLM_PROVIDERS,
  isLLMProvider,
} from './llm-provider.factory';
import { OpenAILLMAdapter } from './openai.adapter';
import { AnthropicLLMAdapter } from './anthropic.adapter';
import { GroqLLMAdapter } from './groq.adapter';

const makeConfig = (env: Record<string, string | undefined>) => ({
  // ConfigService.get is the only method LLMProviderFactory + the adapters use.
  get: vi.fn((key: string) => env[key]),
});

describe('LLMProviderFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SUPPORTED_LLM_PROVIDERS', () => {
    it('exposes exactly openai, anthropic and groq', () => {
      expect([...SUPPORTED_LLM_PROVIDERS].sort()).toEqual(['anthropic', 'groq', 'openai']);
    });
  });

  describe('isLLMProvider', () => {
    it('returns true for known providers', () => {
      expect(isLLMProvider('openai')).toBe(true);
      expect(isLLMProvider('anthropic')).toBe(true);
      expect(isLLMProvider('groq')).toBe(true);
    });

    it('returns false for unknown or malformed values', () => {
      expect(isLLMProvider('mistral')).toBe(false);
      expect(isLLMProvider(null)).toBe(false);
      expect(isLLMProvider(undefined)).toBe(false);
      expect(isLLMProvider(42)).toBe(false);
    });
  });

  describe('MODELS_BY_PROVIDER', () => {
    it('declares the canonical models per provider', () => {
      expect(MODELS_BY_PROVIDER.openai).toContain('gpt-4o-mini');
      expect(MODELS_BY_PROVIDER.openai).toContain('gpt-4o');
      expect(MODELS_BY_PROVIDER.anthropic).toContain('claude-sonnet-4-5');
      expect(MODELS_BY_PROVIDER.anthropic).toContain('claude-haiku-4-5');
      expect(MODELS_BY_PROVIDER.groq).toContain('llama-3.3-70b-versatile');
      expect(MODELS_BY_PROVIDER.groq).toContain('llama-3.1-8b-instant');
    });

    it('keeps providers disjoint (no model belongs to two providers)', () => {
      const seen = new Set<string>();
      for (const provider of SUPPORTED_LLM_PROVIDERS) {
        for (const model of MODELS_BY_PROVIDER[provider]) {
          expect(seen.has(model)).toBe(false);
          seen.add(model);
        }
      }
    });
  });

  describe('isModelAllowedForProvider', () => {
    it('returns true when the model belongs to the provider', () => {
      expect(LLMProviderFactory.isModelAllowedForProvider('gpt-4o-mini', 'openai')).toBe(true);
      expect(LLMProviderFactory.isModelAllowedForProvider('claude-sonnet-4-5', 'anthropic')).toBe(
        true
      );
      expect(LLMProviderFactory.isModelAllowedForProvider('llama-3.1-8b-instant', 'groq')).toBe(
        true
      );
    });

    it('returns false when the model belongs to another provider', () => {
      expect(LLMProviderFactory.isModelAllowedForProvider('gpt-4o-mini', 'anthropic')).toBe(false);
      expect(LLMProviderFactory.isModelAllowedForProvider('claude-sonnet-4-5', 'groq')).toBe(false);
    });
  });

  describe('getProviderForModel', () => {
    it('resolves the right provider per model', () => {
      expect(LLMProviderFactory.getProviderForModel('gpt-4o')).toBe('openai');
      expect(LLMProviderFactory.getProviderForModel('claude-haiku-4-5')).toBe('anthropic');
      expect(LLMProviderFactory.getProviderForModel('llama-3.3-70b-versatile')).toBe('groq');
    });

    it('returns null for unknown models', () => {
      expect(LLMProviderFactory.getProviderForModel('mystery-model-2099')).toBeNull();
    });
  });

  describe('resolve()', () => {
    it('returns the OpenAI adapter by default and for "openai" input', () => {
      const factory = new LLMProviderFactory(makeConfig({ OPENAI_API_KEY: 'sk-test' }) as never);
      expect(factory.resolve('openai')).toBeInstanceOf(OpenAILLMAdapter);
      expect(factory.resolve(null)).toBeInstanceOf(OpenAILLMAdapter);
      expect(factory.resolve(undefined)).toBeInstanceOf(OpenAILLMAdapter);
    });

    it('returns the Anthropic adapter when ANTHROPIC_API_KEY is set', () => {
      const factory = new LLMProviderFactory(
        makeConfig({ OPENAI_API_KEY: 'sk', ANTHROPIC_API_KEY: 'sk-ant-test' }) as never
      );
      const adapter = factory.resolve('anthropic');
      expect(adapter).toBeInstanceOf(AnthropicLLMAdapter);
    });

    it('returns the Groq adapter when GROQ_API_KEY is set', () => {
      const factory = new LLMProviderFactory(
        makeConfig({ OPENAI_API_KEY: 'sk', GROQ_API_KEY: 'gsk-test' }) as never
      );
      const adapter = factory.resolve('groq');
      expect(adapter).toBeInstanceOf(GroqLLMAdapter);
    });

    it('falls back to OpenAI when ANTHROPIC_API_KEY is missing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const factory = new LLMProviderFactory(makeConfig({ OPENAI_API_KEY: 'sk' }) as never);
      const adapter = factory.resolve('anthropic');
      expect(adapter).toBeInstanceOf(OpenAILLMAdapter);
      warn.mockRestore();
    });

    it('falls back to OpenAI when GROQ_API_KEY is missing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const factory = new LLMProviderFactory(makeConfig({ OPENAI_API_KEY: 'sk' }) as never);
      const adapter = factory.resolve('groq');
      expect(adapter).toBeInstanceOf(OpenAILLMAdapter);
      warn.mockRestore();
    });

    it('falls back to OpenAI for unknown provider strings', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const factory = new LLMProviderFactory(makeConfig({ OPENAI_API_KEY: 'sk' }) as never);
      const adapter = factory.resolve('cohere');
      expect(adapter).toBeInstanceOf(OpenAILLMAdapter);
      warn.mockRestore();
    });

    it('memoizes adapters between calls (single Anthropic instance)', () => {
      const factory = new LLMProviderFactory(
        makeConfig({ OPENAI_API_KEY: 'sk', ANTHROPIC_API_KEY: 'sk-ant' }) as never
      );
      const first = factory.resolve('anthropic');
      const second = factory.resolve('anthropic');
      expect(first).toBe(second);
    });

    it('is case-insensitive on the provider name', () => {
      const factory = new LLMProviderFactory(
        makeConfig({ OPENAI_API_KEY: 'sk', GROQ_API_KEY: 'gsk' }) as never
      );
      expect(factory.resolve('GROQ')).toBeInstanceOf(GroqLLMAdapter);
    });
  });

  describe('isProviderConfigured()', () => {
    it('always reports OpenAI as configured (boot-time requirement)', () => {
      const factory = new LLMProviderFactory(makeConfig({ OPENAI_API_KEY: 'sk' }) as never);
      expect(factory.isProviderConfigured('openai')).toBe(true);
    });

    it('reports false for anthropic/groq when their key is missing', () => {
      const factory = new LLMProviderFactory(makeConfig({ OPENAI_API_KEY: 'sk' }) as never);
      expect(factory.isProviderConfigured('anthropic')).toBe(false);
      expect(factory.isProviderConfigured('groq')).toBe(false);
    });

    it('reports true once the keys are provided', () => {
      const factory = new LLMProviderFactory(
        makeConfig({
          OPENAI_API_KEY: 'sk',
          ANTHROPIC_API_KEY: 'sk-ant',
          GROQ_API_KEY: 'gsk',
        }) as never
      );
      expect(factory.isProviderConfigured('anthropic')).toBe(true);
      expect(factory.isProviderConfigured('groq')).toBe(true);
    });
  });
});
