import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LLMService } from './llm.port';
import { OpenAILLMAdapter } from './openai.adapter';
import { AnthropicLLMAdapter } from './anthropic.adapter';
import { GroqLLMAdapter } from './groq.adapter';

/**
 * Supported LLM providers. The string values are persisted on the `AI` model
 * (column `llmProvider`) and validated at the DTO layer via `@IsIn`.
 */
export type LLMProvider = 'openai' | 'anthropic' | 'groq';

export const SUPPORTED_LLM_PROVIDERS: readonly LLMProvider[] = ['openai', 'anthropic', 'groq'];

/**
 * Returns true when the value is one of the providers we know how to route.
 * Useful for narrowing user-supplied strings at the controller/service boundary.
 */
export function isLLMProvider(value: unknown): value is LLMProvider {
  return (
    typeof value === 'string' && (SUPPORTED_LLM_PROVIDERS as readonly string[]).includes(value)
  );
}

/**
 * Pricing-friendly mapping: which model identifiers belong to which provider.
 * This is the canonical source of truth used by the frontend (via the
 * `llmModel` enum) and by `LLMProviderFactory.isModelAllowedForProvider`.
 *
 * Keep alphabetical order within a provider for reviewable diffs.
 */
export const MODELS_BY_PROVIDER: Readonly<Record<LLMProvider, readonly string[]>> = Object.freeze({
  openai: ['gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-haiku-4-5', 'claude-sonnet-4-5'],
  groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
});

/**
 * Resolves the right {@link LLMService} adapter from an AI's `llmProvider`
 * setting, with graceful fallback to OpenAI when the requested provider's
 * API key is missing (e.g. self-hosted deploys that did not configure Groq).
 *
 * Each adapter is instantiated lazily on first request and memoized so that
 * the underlying HTTP client (and its connection pool) is reused across
 * subsequent calls.
 */
@Injectable()
export class LLMProviderFactory {
  private readonly logger = new Logger(LLMProviderFactory.name);
  private readonly adapters = new Map<LLMProvider, LLMService>();

  constructor(private readonly config: ConfigService) {
    // OpenAI is always available since OPENAI_API_KEY is a hard requirement of
    // the rest of the stack (embeddings, RAG). Pre-warm it so that the fallback
    // path never has to allocate at request time.
    this.adapters.set('openai', new OpenAILLMAdapter(config));
  }

  /**
   * Returns the adapter matching `provider`. When the corresponding API key
   * is missing or the value is unknown, returns the OpenAI adapter and logs
   * a warning at most once per provider.
   */
  resolve(provider: string | null | undefined): LLMService {
    const normalized = (provider ?? 'openai').toLowerCase();

    if (!isLLMProvider(normalized)) {
      this.logger.warn(
        `Unknown LLM provider "${provider}", falling back to OpenAI. ` +
          `Allowed: ${SUPPORTED_LLM_PROVIDERS.join(', ')}.`
      );
      return this.adapters.get('openai')!;
    }

    if (!this.isProviderConfigured(normalized)) {
      this.logger.warn(
        `Provider "${normalized}" requested but its API key is missing — ` +
          `falling back to OpenAI. Set ${this.envKeyFor(normalized)} to enable.`
      );
      return this.adapters.get('openai')!;
    }

    const cached = this.adapters.get(normalized);
    if (cached) return cached;

    const adapter = this.instantiate(normalized);
    this.adapters.set(normalized, adapter);
    return adapter;
  }

  /**
   * Returns true when the API key required by `provider` is set in the
   * environment. OpenAI is treated as always available because the rest of
   * the application already enforces `OPENAI_API_KEY` at boot.
   */
  isProviderConfigured(provider: LLMProvider): boolean {
    if (provider === 'openai') return true;
    return !!this.config.get<string>(this.envKeyFor(provider));
  }

  /**
   * Returns true when `model` is part of the catalog declared for `provider`.
   * The frontend uses this to surface only the relevant models per provider.
   */
  static isModelAllowedForProvider(model: string, provider: LLMProvider): boolean {
    return MODELS_BY_PROVIDER[provider].includes(model);
  }

  /**
   * Returns the provider that owns `model` when uniquely determinable. Used
   * by the AI service to auto-correct mismatched (model, provider) tuples
   * (e.g. a legacy AI with `claude-haiku-4-5` saved against `openai`).
   */
  static getProviderForModel(model: string): LLMProvider | null {
    for (const provider of SUPPORTED_LLM_PROVIDERS) {
      if (MODELS_BY_PROVIDER[provider].includes(model)) {
        return provider;
      }
    }
    return null;
  }

  private envKeyFor(provider: LLMProvider): string {
    switch (provider) {
      case 'openai':
        return 'OPENAI_API_KEY';
      case 'anthropic':
        return 'ANTHROPIC_API_KEY';
      case 'groq':
        return 'GROQ_API_KEY';
    }
  }

  private instantiate(provider: LLMProvider): LLMService {
    switch (provider) {
      case 'openai':
        return new OpenAILLMAdapter(this.config);
      case 'anthropic':
        return new AnthropicLLMAdapter(this.config);
      case 'groq':
        return new GroqLLMAdapter(this.config);
    }
  }
}

export const LLM_PROVIDER_FACTORY = Symbol('LLM_PROVIDER_FACTORY');
