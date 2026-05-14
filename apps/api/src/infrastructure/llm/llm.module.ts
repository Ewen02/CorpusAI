import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LLM_SERVICE } from './llm.port';
import { OpenAILLMAdapter } from './openai.adapter';
import { AnthropicLLMAdapter } from './anthropic.adapter';
import { GroqLLMAdapter } from './groq.adapter';
import { LLMProviderFactory } from './llm-provider.factory';

/**
 * Wires the LLM infrastructure into the DI container.
 *
 * - `LLM_SERVICE` remains bound to the OpenAI adapter so legacy call sites
 *   that do not yet pick a provider per-AI (e.g. background suggestion jobs)
 *   keep their current behaviour.
 * - `LLMProviderFactory` is the new entry point for per-AI provider routing.
 *   Inject it where you need to dispatch to anthropic/groq based on the
 *   AI's `llmProvider` column.
 *
 * All three concrete adapters are also registered as standalone providers
 * to make ad-hoc injection (e.g. in tests) ergonomic.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    OpenAILLMAdapter,
    AnthropicLLMAdapter,
    GroqLLMAdapter,
    LLMProviderFactory,
    {
      provide: LLM_SERVICE,
      useExisting: OpenAILLMAdapter,
    },
  ],
  exports: [LLM_SERVICE, LLMProviderFactory, OpenAILLMAdapter, AnthropicLLMAdapter, GroqLLMAdapter],
})
export class LLMModule {}
