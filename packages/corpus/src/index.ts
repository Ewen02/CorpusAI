// =============================================================================
// @corpusai/corpus - Services RAG pour CorpusAI
// =============================================================================

// Embeddings
export type { EmbeddingService, OpenAIEmbeddingConfig } from './embeddings';
export { OpenAIEmbeddingService, SparseVectorGenerator } from './embeddings';

// Vector Store
export type {
  SparseVector,
  ChunkPayload,
  HybridVectorPoint,
  VectorStoreService,
  VectorPoint,
  SearchResult,
  SearchOptions,
  FilterCondition,
  FilterClause,
  QdrantConfig,
} from './vector-store';
export { QdrantVectorStore } from './vector-store';

// Chunking
export type {
  ChunkingService,
  Chunk,
  ChunkMetadata,
  RecursiveChunkerOptions,
  MarkdownChunkerOptions,
  TokenChunkerOptions,
  ParentChildChunkerOptions,
} from './chunking';
export {
  RecursiveChunker,
  MarkdownChunker,
  TokenChunker,
  ParentChildChunker,
  CHUNKER_DEFAULTS,
} from './chunking';

// RAG Pipeline
export type {
  RAGPipeline,
  Document,
  IndexResult,
  IndexOptions,
  ContextEnrichmentConfig,
  ProcessingStage,
  ProgressCallback,
  QueryOptions,
  QueryMetrics,
  RAGResponse,
  Source,
  LLMConfig,
} from './rag';
export { RAGPipelineImpl } from './rag';

// Parsers
export type {
  DocumentParser,
  ParserInput,
  ParsedDocument,
  DocumentMetadata,
  SupportedMimeType,
} from './parsers';
export {
  SUPPORTED_MIME_TYPES,
  DocumentParserService,
  PdfParser,
  DocxParser,
  TextParser,
} from './parsers';

// Reranking
export type {
  Reranker,
  AsyncReranker,
  RerankerConfig,
  ScoredResult,
  CohereRerankerConfig,
} from './reranking';
export { BM25, CohereReranker } from './reranking';

// Cache
export type { CacheService, CachedEmbeddingConfig, CacheMetrics } from './cache';
export { CachedEmbeddingService } from './cache';

// Models
export type { ModelConfig } from './rag/models';
export { AVAILABLE_MODELS, getModelConfig, resolveModelConfig } from './rag/models';
