export interface CorpusAIOptions {
  /** Base URL for the API. Defaults to 'https://api.corpusai.io' */
  baseUrl?: string;
  /**
   * Request timeout in milliseconds. Defaults to 30000.
   *
   * For `queryStream` this covers connection / first-byte only — it is cleared
   * once response headers arrive so a long answer is never aborted mid-token.
   */
  timeout?: number;
  /**
   * Idle timeout for streaming, in milliseconds. Applies to `queryStream`
   * only: it re-arms after every received chunk and aborts the stream if no
   * data arrives within the window (a stalled connection). Defaults to
   * `timeout`. Set to `0` to disable idle timeouts entirely.
   */
  idleTimeout?: number;
  /** Optional custom fetch implementation (e.g. node-fetch, undici). */
  fetch?: typeof fetch;
}

export interface Source {
  chunkId: string;
  documentSource: string;
  score: number;
  text: string;
}

export interface QueryMetrics {
  embeddingMs: number;
  searchMs: number;
  rerankMs: number;
  llmMs: number;
  totalMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  metrics: QueryMetrics;
}

export interface AIInfo {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  documentCount: number;
}

export interface APIErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface ListAIsOptions {
  /** Number of items to skip (0-based offset). */
  skip?: number;
  /** Number of items to return (max 100). */
  take?: number;
}

export interface QueryStreamEvent {
  type: 'token' | 'sources' | 'done' | 'error';
  /** Token text (for `type === 'token'`). */
  token?: string;
  /** Sources list (for `type === 'sources'`). */
  sources?: Source[];
  /** Final metrics + answer (for `type === 'done'`). */
  answer?: string;
  metrics?: QueryMetrics;
  /** Error message (for `type === 'error'`). */
  error?: string;
}
