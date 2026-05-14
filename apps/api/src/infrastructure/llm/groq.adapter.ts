import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { LLMService, LLMChatCompletionParams, LLMChatCompletionResponse } from './llm.port';

/**
 * Adapter for Groq's OpenAI-compatible Chat Completions API.
 *
 * Groq exposes an endpoint at `https://api.groq.com/openai/v1` that mirrors
 * the OpenAI Chat Completions wire format, so we reuse the official OpenAI
 * SDK with a custom `baseURL` and `apiKey`. The supported models (LPU-served)
 * are llama-3.x, mixtral-8x7b, gemma-* — all hosted by Groq itself.
 *
 * `responseFormat: { type: 'json_object' }` is forwarded as-is: Groq supports
 * the same JSON mode parameter.
 */
@Injectable()
export class GroqLLMAdapter implements LLMService {
  private readonly client: OpenAI;
  private readonly defaultModel: string;

  /** Public Groq API endpoint, OpenAI-compatible. */
  private static readonly DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('GROQ_API_KEY') || '';
    this.defaultModel = config.get<string>('GROQ_MODEL') || 'llama-3.1-8b-instant';
    const baseURL = config.get<string>('GROQ_BASE_URL') || GroqLLMAdapter.DEFAULT_BASE_URL;
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async chatCompletion(params: LLMChatCompletionParams): Promise<LLMChatCompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: params.model || this.defaultModel,
      messages: params.messages,
      ...(params.temperature !== undefined && { temperature: params.temperature }),
      ...(params.maxTokens !== undefined && { max_tokens: params.maxTokens }),
      ...(params.responseFormat && { response_format: params.responseFormat }),
    });

    return {
      content: response.choices[0]?.message?.content ?? '',
      ...(response.usage && { usage: { totalTokens: response.usage.total_tokens } }),
    };
  }
}
