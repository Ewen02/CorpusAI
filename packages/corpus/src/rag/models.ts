/**
 * Available LLM models and their provider configuration.
 * All models use the OpenAI-compatible API format.
 */

export interface ModelConfig {
  id: string;
  provider: 'openai' | 'mistral';
  displayName: string;
  envKeyName: string;
  baseURL?: string;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    displayName: 'GPT-4o Mini',
    envKeyName: 'OPENAI_API_KEY',
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    envKeyName: 'OPENAI_API_KEY',
  },
  {
    id: 'mistral-large-latest',
    provider: 'mistral',
    displayName: 'Mistral Large',
    envKeyName: 'MISTRAL_API_KEY',
    baseURL: 'https://api.mistral.ai/v1',
  },
  {
    id: 'mistral-small-latest',
    provider: 'mistral',
    displayName: 'Mistral Small',
    envKeyName: 'MISTRAL_API_KEY',
    baseURL: 'https://api.mistral.ai/v1',
  },
];

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === modelId);
}

export function resolveModelConfig(
  modelId: string,
  apiKeys: Record<string, string>
): { apiKey: string; baseURL?: string; model: string } | null {
  const config = getModelConfig(modelId);
  if (!config) return null;

  const apiKey = apiKeys[config.envKeyName];
  if (!apiKey) return null;

  return {
    apiKey,
    baseURL: config.baseURL,
    model: config.id,
  };
}
