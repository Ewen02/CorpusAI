import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { LLMService, LLMChatCompletionParams, LLMChatCompletionResponse } from './llm.port';

@Injectable()
export class OpenAILLMAdapter implements LLMService {
  private readonly client: OpenAI;
  private readonly defaultModel: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('LLM_API_KEY') || config.get<string>('OPENAI_API_KEY') || '';
    const baseURL = config.get<string>('LLM_BASE_URL');
    this.defaultModel = config.get<string>('LLM_MODEL') || 'gpt-4o-mini';
    this.client = new OpenAI({ apiKey, ...(baseURL && { baseURL }) });
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
