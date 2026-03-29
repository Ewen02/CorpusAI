export interface CorpusAIOptions {
  /** Base URL for the API. Defaults to 'https://api.corpusai.io' */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30000 */
  timeout?: number;
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
