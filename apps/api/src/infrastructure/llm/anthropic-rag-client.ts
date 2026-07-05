import Anthropic from '@anthropic-ai/sdk';
import {
  LLMTransientError,
  type LLMClient,
  type LLMChatMessage,
  type LLMCompletionOptions,
  type LLMCompletion,
  type LLMUsage,
} from '@corpusai/corpus';

/**
 * Implémentation Anthropic (Messages API) du port `LLMClient` du pipeline RAG.
 *
 * Contrairement à `AnthropicLLMAdapter` (port interne `LLMService`, non
 * streamé, pour suggestions/résumés), ce client est injecté dans
 * `RAGPipelineImpl` via `LLMConfig.client` et couvre TOUT le chemin de
 * génération RAG : réponse finale, streaming SSE, HyDE, condensation,
 * décomposition multi-query.
 *
 * Particularités Messages API :
 * - le prompt système est un champ top-level (pas un message role=system) ;
 * - pas de JSON mode natif → émulé par instruction système stricte ;
 * - `max_tokens` obligatoire (défaut 1024) ;
 * - l'usage streaming arrive via message_start (input) et message_delta (output).
 */
export class AnthropicRagLLMClient implements LLMClient {
  private readonly client: Anthropic;
  private readonly model: string;

  private static readonly DEFAULT_MAX_TOKENS = 1024;
  private static readonly JSON_HINT =
    'You MUST respond with a single JSON object only. No prose, no markdown fences.';

  constructor(config: { apiKey: string; model: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async complete(
    messages: LLMChatMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletion> {
    const { system, conversation } = this.splitMessages(messages, options?.jsonMode);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens ?? AnthropicRagLLMClient.DEFAULT_MAX_TOKENS,
        ...(system && { system }),
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        messages: conversation,
      });

      const content = response.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('');

      return {
        content,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async stream(
    messages: LLMChatMessage[],
    options?: LLMCompletionOptions
  ): Promise<AsyncGenerator<string, LLMUsage | undefined>> {
    const { system, conversation } = this.splitMessages(messages, options?.jsonMode);

    try {
      const stream = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens ?? AnthropicRagLLMClient.DEFAULT_MAX_TOKENS,
        ...(system && { system }),
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        stream: true,
        messages: conversation,
      });

      return (async function* () {
        let inputTokens: number | undefined;
        let outputTokens: number | undefined;

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
          } else if (event.type === 'message_start') {
            inputTokens = event.message.usage.input_tokens;
          } else if (event.type === 'message_delta') {
            outputTokens = event.usage.output_tokens;
          }
        }

        if (inputTokens === undefined && outputTokens === undefined) return undefined;
        return {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens:
            inputTokens !== undefined && outputTokens !== undefined
              ? inputTokens + outputTokens
              : undefined,
        };
      })();
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Sépare le prompt système (champ top-level Anthropic) des messages de
   * conversation, et injecte l'instruction JSON si demandée.
   */
  private splitMessages(
    messages: LLMChatMessage[],
    jsonMode?: boolean
  ): { system: string; conversation: Array<{ role: 'user' | 'assistant'; content: string }> } {
    const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content);
    if (jsonMode) {
      systemParts.push(AnthropicRagLLMClient.JSON_HINT);
    }

    const conversation = messages
      .filter((m): m is LLMChatMessage & { role: 'user' | 'assistant' } => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    return { system: systemParts.join('\n\n'), conversation };
  }

  /** Erreurs transitoires Anthropic → LLMTransientError (retry côté pipeline) */
  private mapError(error: unknown): unknown {
    if (
      error instanceof Anthropic.APIConnectionError ||
      error instanceof Anthropic.RateLimitError ||
      error instanceof Anthropic.InternalServerError
    ) {
      const message = error instanceof Error ? error.message : String(error);
      return new LLMTransientError(message, error);
    }
    return error;
  }
}
