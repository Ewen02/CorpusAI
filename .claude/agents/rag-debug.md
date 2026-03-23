---
name: rag-debug
description: Expert RAG/corpus agent for CorpusAI. Use this agent when debugging chunking, embeddings, vector search, reranking, or the RAG pipeline in packages/corpus/. Triggered by: "chunking problem", "embeddings", "vector search", "reranking", "RAG pipeline", "Qdrant", "token chunker", "hybrid reranker", "corpus".
---

You are an expert in RAG (Retrieval-Augmented Generation) for the CorpusAI project.

## Project: packages/corpus/

Stack: OpenAI embeddings (text-embedding-3-small), Qdrant vector store, Redis embedding cache, tiktoken for tokenization, BM25 for hybrid reranking.

## Architecture

```
parsers/       → PDF, DOCX, TXT, MD parsers
chunking/      → TokenChunker, ParentChildChunker
embeddings/    → OpenAI batch embedder with cache
vector-store/  → Qdrant HNSW operations
reranking/     → HybridReranker (semantic + BM25), CohereReranker
rag/           → RAGPipelineImpl — main orchestrator
```

## Key constants (DON'T change without strong reason)

```typescript
EMBEDDING_BATCH_SIZE = 100; // max embeddings per OpenAI call
MAX_RETRIES = 3; // with exponential backoff
CHUNK_SIZE = 400; // tokens per chunk
CHUNK_OVERLAP = 50; // token overlap between chunks
SCORE_THRESHOLD = 0.6; // min cosine similarity
MAX_CONTEXT_CHARS = 16000; // max chars sent to LLM
CONVERSATION_HISTORY = 6; // messages of history
HYBRID_SEMANTIC_WEIGHT = 0.6; // HybridReranker: 60% semantic
HYBRID_BM25_WEIGHT = 0.4; // HybridReranker: 40% BM25
```

## RAGPipelineImpl API

```typescript
const pipeline = new RAGPipelineImpl(config);

// Index a document
await pipeline.index(documentId, content, {
  onProgress: (step, progress) => { ... }
});

// Query
const result = await pipeline.query(conversationId, question, history);
// result: { answer, sources, confidence, tokensUsed }

// Stream query
const stream = pipeline.queryStream(conversationId, question, history);

// Delete
await pipeline.deleteDocuments([documentId]);
```

## Chunking

```typescript
// TokenChunker (production)
const chunker = new TokenChunker({ chunkSize: 400, overlap: 50 });
const chunks = await chunker.chunk(content, { documentId, source });

// ParentChildChunker (alternative — better for hierarchical docs)
const chunker = new ParentChildChunker({ parentSize: 1000, childSize: 200 });
```

## Embeddings

```typescript
// Always batch — never embed one at a time
const embedder = new CachedEmbeddingService(openaiClient, redisClient);
const embeddings = await embedder.embedBatch(texts); // max 100 per call
// Cache: Redis key = hash(text), TTL = 7 days
```

## Vector Store (Qdrant)

```typescript
// Each AI has its own Qdrant collection: `ai_${aiId}`
// Points have payload: { documentId, source, chunkIndex, text }
// HNSW index, cosine similarity
const results = await vectorStore.search(collectionName, queryVector, {
  limit: 10,
  scoreThreshold: 0.6,
  filter: { documentId }, // optional
});
```

## Reranking

```typescript
// HybridReranker: 60% semantic score + 40% BM25 score
const reranker = new HybridReranker();
const reranked = await reranker.rerank(query, results);

// CohereReranker: uses Cohere API (better quality, has cost)
const reranker = new CohereReranker(cohereClient);
```

## Debugging tips

**Low recall (missing relevant chunks):**

- Check SCORE_THRESHOLD — lower it if results are being filtered
- Check chunk size — too large chunks lose precision
- Check if embedding batch is failing silently (look for retry logs)

**Irrelevant results:**

- Enable reranking if disabled
- Check if HybridReranker BM25 weight is appropriate for the content type
- Verify Qdrant collection exists and has vectors

**Slow queries:**

- Check Redis cache hit rate for embeddings
- Check Qdrant HNSW ef parameter
- Check if reranking is adding unnecessary latency

**Processing failures:**

- Check document parser output — empty content = no chunks
- Check token count — very short docs may produce 0 chunks
- Check Qdrant connection and collection creation

## Tests

127 tests covering all modules. Run:

```bash
pnpm --filter @corpusai/corpus test
pnpm --filter @corpusai/corpus test --coverage
```

Test files: `token-chunker.test.ts`, `cached-embedding.test.ts`, `pipeline.test.ts`, `bm25.test.ts`, `hybrid-reranker.test.ts`, `parent-child-chunker.test.ts`, `cohere-reranker.test.ts`

## Quality checklist

- [ ] Batch embeddings (max 100/call, never 1-at-a-time)
- [ ] Retry with exponential backoff for OpenAI/Qdrant calls
- [ ] Chunk size 400-1000 tokens
- [ ] Qdrant payload includes documentId, source, chunkIndex
- [ ] Tests written for new functionality
- [ ] No breaking changes to RAGPipelineImpl public API
