# @corpusai/corpus — Pipeline RAG complet

## Modules

parsers (PDF/DOCX/TXT), chunking (Recursive/Markdown/Token/ParentChild), embeddings (OpenAI), vector-store (Qdrant), cache (Redis), reranking (BM25/Hybrid), rag (RAGPipelineImpl).

## RAGPipelineImpl

```typescript
const pipeline = new RAGPipelineImpl(embeddingService, vectorStore, chunker, llmConfig, reranker);
await pipeline.index(documents, { onProgress, batchSize: 100 });
const response = await pipeline.query(question, { topK: 5, scoreThreshold: 0.6 });
const stream = pipeline.queryStream(question, options); // SSE
await pipeline.deleteDocuments(documentIds);
```

## Chunking (production)

`ParentChildChunker` : child 150 tokens (overlap 50), parent 512 tokens. Encoding: tiktoken `cl100k_base`.
Other chunkers exist but are not used in production.

## Reranking

`HybridReranker` : 60% semantic (cosine) + 40% lexical (BM25).

## Constants

See source for values: EMBEDDING_BATCH_SIZE=100, MAX_RETRIES=3, model=gpt-4o-mini, temperature=0.2, maxTokens=1000, scoreThreshold=0.6, maxContextChars=16000.

## Dependencies

- `@corpusai/ai-rules` : `buildSystemPrompt()`, `buildContextSection()`, `determineConfidence()`
- OpenAI SDK : embeddings + chat completions
- `@qdrant/js-client-rest` : vector store

## Tests

`pnpm --filter @corpusai/corpus test` — token-chunker, cached-embedding, pipeline, bm25, hybrid-reranker.

## Checklist

- [ ] Batch embeddings (max 100/call), retry with exponential backoff
- [ ] Non-retriable errors detected (invalid, unauthorized, forbidden)
- [ ] Chunks 400-1000 tokens, metadata: documentId, source, chunkIndex, text
- [ ] Tests for any new functionality
