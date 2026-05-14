export interface CorpusAIOptions {
  /** Base URL for the API. Defaults to 'https://api.corpusai.io' */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30000 */
  timeout?: number;
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
