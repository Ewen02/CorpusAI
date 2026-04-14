export const LLM_SERVICE = Symbol('LLM_SERVICE');

export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMChatCompletionParams {
  messages: LLMChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' };
}

export interface LLMChatCompletionResponse {
  content: string;
  usage?: { totalTokens: number };
}

export interface LLMService {
  chatCompletion(params: LLMChatCompletionParams): Promise<LLMChatCompletionResponse>;
}
