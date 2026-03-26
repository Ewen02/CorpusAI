# @corpusai/corpus — Pipeline RAG complet

## Architecture

```
src/
├── parsers/       # PDF (pdf-parse), DOCX (mammoth), TXT/MD/CSV/HTML (chardet)
├── chunking/      # RecursiveChunker, MarkdownChunker, TokenChunker (tiktoken)
├── embeddings/    # OpenAI text-embedding-3-small (1536 dims, batch 100)
├── vector-store/  # Qdrant (HNSW, Cosine, filtering, collection management)
├── cache/         # Redis embedding cache (7 jours TTL, mget/mset batch)
├── reranking/     # BM25 + HybridReranker (60% semantic + 40% lexical)
└── rag/           # RAGPipelineImpl (index, query, queryStream, deleteDocuments)
```

## Pattern module

Chaque module suit :

```
types.ts     # Interfaces (Service, Config, Options)
index.ts     # Barrel exports
*.ts         # Implementation
*.test.ts    # Tests (vitest)
```

## RAGPipelineImpl

```typescript
const pipeline = new RAGPipelineImpl(embeddingService, vectorStore, chunker, llmConfig, reranker);

// Indexer des documents
await pipeline.index(documents, { onProgress, batchSize: 100 });

// Query avec LLM
const response = await pipeline.query(question, { topK: 5, scoreThreshold: 0.6 });

// Query en streaming (SSE)
const stream = pipeline.queryStream(question, options);
for await (const token of stream) {
  /* ... */
}

// Supprimer
await pipeline.deleteDocuments(documentIds);
```

## Constantes cles

| Constante            | Valeur              | Description                                   |
| -------------------- | ------------------- | --------------------------------------------- |
| EMBEDDING_BATCH_SIZE | 100                 | Max embeddings par appel OpenAI               |
| MAX_RETRIES          | 3                   | Retries avec backoff exponentiel (1s, 2s, 4s) |
| Default model        | gpt-4o-mini         | LLM pour generation                           |
| temperature          | 0.2                 | Temperature par defaut                        |
| maxTokens            | 1000                | Tokens max par reponse                        |
| scoreThreshold       | 0.6                 | Seuil de pertinence (overridable a 0.4)       |
| maxContextChars      | 16000               | Garde-fou contexte                            |
| Conversation history | 6 derniers messages | Historique multi-turn                         |

## Chunking (production)

`ParentChildChunker` est utilise en production :

- Child chunks : 150 tokens, overlap 50 tokens (precision de retrieval)
- Parent chunks : 512 tokens (contexte riche pour le LLM)
- Encoding : tiktoken `cl100k_base`

`TokenChunker`, `RecursiveChunker` et `MarkdownChunker` existent mais ne sont pas utilises en production.

## Reranking

`HybridReranker` combine :

- 60% score semantique (cosine similarity)
- 40% score lexical (BM25)

## Dependencies

- `@corpusai/ai-rules` : `buildSystemPrompt()`, `buildContextSection()`, `determineConfidence()`
- OpenAI SDK : embeddings + chat completions
- `@qdrant/js-client-rest` : vector store

## Tests

```bash
pnpm --filter @corpusai/corpus test           # 127 tests
pnpm --filter @corpusai/corpus test:coverage   # Avec coverage
```

Tests existants : token-chunker, cached-embedding, pipeline, bm25, hybrid-reranker

## Checklist qualite

- [ ] Batch embeddings (max 100 par appel)
- [ ] Retry avec backoff exponentiel pour erreurs transitoires
- [ ] Erreurs non-retriables detectees (invalid, unauthorized, forbidden)
- [ ] Chunks 400-1000 tokens
- [ ] Metadata Qdrant : documentId, source, chunkIndex, text
- [ ] Tests pour toute nouvelle fonctionnalite
