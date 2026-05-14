import type {
  CorpusAIOptions,
  QueryResponse,
  AIInfo,
  APIErrorBody,
  ListAIsOptions,
  QueryStreamEvent,
} from './types';
import { CorpusAIError } from './errors';

const DEFAULT_BASE_URL = 'https://api.corpusai.io';
const DEFAULT_TIMEOUT = 30_000;
const MAX_TAKE = 100;

export class CorpusAI {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly fetchImpl: typeof fetch;

  constructor(apiKey: string, options: CorpusAIOptions = {}) {
    if (!apiKey || !apiKey.startsWith('cai_')) {
      throw new Error('Invalid API key. CorpusAI API keys start with "cai_".');
    }

    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  /**
   * Query an AI assistant.
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
   * Stream tokens from an AI assistant as they are generated.
   *
   * Yields events of type `token` (one per partial generation), `sources`
   * (once when retrieval completes), and `done` (once with final answer + metrics).
   *
   * @example
   * ```typescript
   * for await (const event of client.queryStream('my-ai', 'What is RAG?')) {
   *   if (event.type === 'token') process.stdout.write(event.token!);
   *   if (event.type === 'done') console.log('\nMetrics:', event.metrics);
   * }
   * ```
   */
  async *queryStream(slug: string, question: string): AsyncGenerator<QueryStreamEvent> {
    const url = `${this.baseUrl}/v1/query/stream`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ slug, question }),
      });

      if (!response.ok) {
        throw await this.parseErrorResponse(response);
      }
      if (!response.body) {
        throw new CorpusAIError(500, {
          statusCode: 500,
          message: 'Streaming response has no body',
          error: 'StreamError',
        });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE: each event is `data: <json>\n\n`
        let nlIndex: number;
        while ((nlIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, nlIndex);
          buffer = buffer.slice(nlIndex + 2);
          for (const line of rawEvent.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (!payload) continue;
            try {
              yield JSON.parse(payload) as QueryStreamEvent;
            } catch {
              // Skip malformed event lines silently — best-effort streaming.
            }
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * List AI assistants accessible to your API key, with pagination.
   *
   * @example
   * ```typescript
   * const ais = await client.listAIs({ skip: 0, take: 20 });
   * ```
   */
  async listAIs(options: ListAIsOptions = {}): Promise<AIInfo[]> {
    const skip = Math.max(0, options.skip ?? 0);
    const take = Math.min(MAX_TAKE, Math.max(1, options.take ?? 50));
    const query = `?skip=${skip}&take=${take}`;
    return this.request<AIInfo[]>(`/v1/ais${query}`, { method: 'GET' });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchImpl(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...(init.headers as Record<string, string>),
        },
      });

      if (!response.ok) {
        throw await this.parseErrorResponse(response);
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

  private async parseErrorResponse(response: Response): Promise<CorpusAIError> {
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
    return new CorpusAIError(response.status, body);
  }
}
