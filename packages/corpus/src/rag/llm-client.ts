import OpenAI, { APIConnectionError, RateLimitError, InternalServerError } from 'openai';

/**
 * Port LLM du pipeline RAG — découple la génération du SDK OpenAI.
 *
 * Le pipeline parle ce contrat pour TOUS ses appels LLM (réponse finale,
 * streaming, HyDE, condensation, décomposition multi-query). L'hôte peut
 * injecter un client alternatif via `LLMConfig.client` (ex: adapter Anthropic
 * Messages API côté apps/api) sans que le package corpus dépende du SDK tiers.
 */

/** Message de chat, indépendant du provider */
export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Options d'un appel de complétion */
export interface LLMCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  /**
   * Force une réponse JSON (response_format côté OpenAI ; les providers sans
   * JSON mode natif l'émulent par instruction système).
   */
  jsonMode?: boolean;
}

/** Comptage de tokens d'un appel */
export interface LLMUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/** Résultat d'une complétion non-streamée */
export interface LLMCompletion {
  content: string;
  usage?: LLMUsage;
}

/**
 * Erreur transitoire (connexion, rate limit, 5xx) — seul type d'erreur que le
 * pipeline retente. Les adapters DOIVENT wrapper leurs erreurs SDK transitoires
 * dans cette classe ; tout le reste est traité comme permanent.
 */
export class LLMTransientError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'LLMTransientError';
    this.cause = cause;
  }
}

/** Contrat d'un client LLM injectable dans le pipeline RAG */
export interface LLMClient {
  /** Complétion simple */
  complete(messages: LLMChatMessage[], options?: LLMCompletionOptions): Promise<LLMCompletion>;
  /**
   * Complétion streamée. La création (connexion) est awaitable — et donc
   * retryable — séparément de l'itération : le générateur retourné yield les
   * tokens et retourne l'usage final (si le provider le fournit).
   */
  stream(
    messages: LLMChatMessage[],
    options?: LLMCompletionOptions
  ): Promise<AsyncGenerator<string, LLMUsage | undefined>>;
}

/** Configuration du client OpenAI (ou compatible : OpenRouter, Groq, Mistral…) */
export interface OpenAILLMClientConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
}

function mapOpenAIError(error: unknown): unknown {
  if (
    error instanceof APIConnectionError ||
    error instanceof RateLimitError ||
    error instanceof InternalServerError
  ) {
    const message = error instanceof Error ? error.message : String(error);
    return new LLMTransientError(message, error);
  }
  return error;
}

/**
 * Implémentation OpenAI (et compatibles) du port LLM.
 * C'est le client par défaut du pipeline quand aucun `LLMConfig.client`
 * n'est injecté.
 */
export class OpenAILLMClient implements LLMClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: OpenAILLMClientConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      defaultHeaders: config.baseURL?.includes('openrouter')
        ? { 'HTTP-Referer': 'https://corpusai.io', 'X-Title': 'CorpusAI' }
        : undefined,
    });
    this.model = config.model;
  }

  async complete(
    messages: LLMChatMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletion> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
        ...(options?.jsonMode && { response_format: { type: 'json_object' as const } }),
        messages,
      });

      return {
        content: response.choices[0]?.message.content || '',
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      throw mapOpenAIError(error);
    }
  }

  async stream(
    messages: LLMChatMessage[],
    options?: LLMCompletionOptions
  ): Promise<AsyncGenerator<string, LLMUsage | undefined>> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
        stream: true as const,
        stream_options: { include_usage: true },
        messages,
      });

      return (async function* () {
        let usage: LLMUsage | undefined;
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content || '';
          if (token) {
            yield token;
          }
          // L'usage arrive dans le dernier chunk avec include_usage
          if (chunk.usage) {
            usage = {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            };
          }
        }
        return usage;
      })();
    } catch (error) {
      throw mapOpenAIError(error);
    }
  }
}
