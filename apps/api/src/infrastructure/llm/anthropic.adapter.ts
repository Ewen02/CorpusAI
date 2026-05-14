import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { LLMService, LLMChatCompletionParams, LLMChatCompletionResponse } from './llm.port';

/**
 * Adapter for Anthropic's Messages API (Claude models).
 *
 * Notes:
 *  - Anthropic distinguishes between the `system` prompt (top-level field) and
 *    `messages` (only `user` / `assistant` roles). We split the incoming
 *    OpenAI-shaped messages accordingly.
 *  - `responseFormat: { type: 'json_object' }` is not natively supported. We
 *    emulate it by appending a strict JSON instruction to the system prompt
 *    so the rest of the codebase (which calls `JSON.parse(content)`) keeps
 *    working transparently.
 *  - Anthropic always requires `max_tokens`; we default to 1024 when the
 *    caller does not provide one.
 */
@Injectable()
export class AnthropicLLMAdapter implements LLMService {
  private readonly logger = new Logger(AnthropicLLMAdapter.name);
  private readonly client: Anthropic;
  private readonly defaultModel: string;

  /** Default max_tokens when the caller omits the value (Anthropic requires it). */
  private static readonly DEFAULT_MAX_TOKENS = 1024;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY') || '';
    this.defaultModel = config.get<string>('ANTHROPIC_MODEL') || 'claude-haiku-4-5';
    this.client = new Anthropic({ apiKey });
  }

  async chatCompletion(params: LLMChatCompletionParams): Promise<LLMChatCompletionResponse> {
    // Split system prompts from conversation messages.
    const systemMessages = params.messages.filter((m) => m.role === 'system');
    const conversationMessages = params.messages.filter((m) => m.role !== 'system');

    let systemPrompt = systemMessages.map((m) => m.content).join('\n\n');

    // Emulate OpenAI's JSON mode by reinforcing the requirement in the system prompt.
    if (params.responseFormat?.type === 'json_object') {
      const jsonHint =
        'You MUST respond with a single JSON object only. No prose, no markdown fences.';
      systemPrompt = systemPrompt ? `${systemPrompt}\n\n${jsonHint}` : jsonHint;
    }

    const response = await this.client.messages.create({
      model: params.model || this.defaultModel,
      max_tokens: params.maxTokens ?? AnthropicLLMAdapter.DEFAULT_MAX_TOKENS,
      ...(systemPrompt && { system: systemPrompt }),
      ...(params.temperature !== undefined && { temperature: params.temperature }),
      messages: conversationMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    // Concatenate all text blocks (Anthropic returns an array of content blocks).
    const content = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');

    return {
      content,
      usage: {
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }
}
