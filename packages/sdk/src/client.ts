import type { CorpusAIOptions, QueryResponse, AIInfo, APIErrorBody } from './types';
import { CorpusAIError } from './errors';

const DEFAULT_BASE_URL = 'https://api.corpusai.io';
const DEFAULT_TIMEOUT = 30_000;

export class CorpusAI {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(apiKey: string, options: CorpusAIOptions = {}) {
    if (!apiKey || !apiKey.startsWith('cai_')) {
      throw new Error('Invalid API key. CorpusAI API keys start with "cai_".');
    }

    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Query an AI assistant.
   *
   * @param slug - The AI's unique slug identifier
   * @param question - The question to ask (max 2000 characters)
   * @returns The AI's answer with sources and performance metrics
   *
   * @example
   * ```typescript
   * const { answer, sources } = await client.query('my-ai', 'What is RAG?');
   * ```
   */
  async query(slug: string, question: string): Promise<QueryResponse> {
    return this.request<QueryResponse>('/v1/query', {
      method: 'POST',
      body: JSON.stringify({ slug, question }),
    });
  }

  /**
   * List all AI assistants associated with your API key.
   *
   * @returns Array of AI assistant summaries
   *
   * @example
   * ```typescript
   * const ais = await client.listAIs();
   * for (const ai of ais) {
   *   console.log(`${ai.name} (${ai.documentCount} docs)`);
   * }
   * ```
   */
  async listAIs(): Promise<AIInfo[]> {
    return this.request<AIInfo[]>('/v1/ais', { method: 'GET' });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...(init.headers as Record<string, string>),
        },
      });

      if (!response.ok) {
        let body: APIErrorBody;
        try {
          body = (await response.json()) as APIErrorBody;
        } catch {
          body = {
            statusCode: response.status,
            message: response.statusText,
            error: 'Unknown',
          };
        }
        throw new CorpusAIError(response.status, body);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof CorpusAIError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new CorpusAIError(408, {
          statusCode: 408,
          message: `Request timed out after ${this.timeout}ms`,
          error: 'Timeout',
        });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
