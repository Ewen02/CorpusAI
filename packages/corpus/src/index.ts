// =============================================================================
// @corpusai/corpus - Services RAG pour CorpusAI
// =============================================================================

// Embeddings
export type { EmbeddingService, OpenAIEmbeddingConfig } from './embeddings';
export { OpenAIEmbeddingService } from './embeddings';

// Vector Store
export type {
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
} from './chunking';
export { RecursiveChunker, MarkdownChunker } from './chunking';

// RAG Pipeline
export type {
  RAGPipeline,
  Document,
  IndexResult,
  QueryOptions,
  RAGResponse,
  Source,
  LLMConfig,
} from './rag';
export { RAGPipelineImpl } from './rag';
