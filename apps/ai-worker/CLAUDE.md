# apps/ai-worker — BullMQ Document Processing Worker

## Stack

BullMQ worker consuming from Redis. Uses `@corpusai/corpus` (RAG pipeline), `@corpusai/database` (Prisma), `@corpusai/queue` (constants/types).

## Architecture

```
API enqueue job → Redis (BullMQ) → Worker picks up → processDocument()
Worker publishes progress → Redis pub/sub → API SSE endpoint → Frontend
```

## Structure

```
src/
├── index.ts                  # Entry: create worker, Redis connect, graceful shutdown
├── worker.ts                 # BullMQ Worker setup, concurrency=3
├── processors/
│   └── document-processor.ts # Full processing pipeline
├── services/
│   ├── progress.service.ts   # Redis pub/sub progress publisher
│   └── rag-factory.ts        # Singleton RAGPipelineImpl per AI
└── experiments/              # Standalone scripts (not production)
```

## Document Processing Flow

1. Receive `DocumentProcessingJobData` (documentId, aiId, filename, mimeType, content/buffer/url)
2. Mark document `PROCESSING`, publish progress 2%
3. Parse: text → bypass, buffer/URL → `DocumentParserService` (PDF/DOCX/TXT/MD)
4. Index via `pipeline.index()` with progress callback (chunking → embedding → storing)
5. Update document: `INDEXED`, chunkCount, wordCount, pageCount, title, author, language
6. On error: mark `FAILED` with errorMessage, re-throw for BullMQ retry

## Progress Stages

| Stage     | Range   | Description       |
| --------- | ------- | ----------------- |
| PARSING   | 0-10%   | Parse content     |
| CHUNKING  | ~10%    | Split into chunks |
| EMBEDDING | 10-80%  | Batch embed       |
| STORING   | 80-100% | Upsert in Qdrant  |

Queue config: see `@corpusai/queue` (queue name, retry policy, channels). Worker concurrency: 3.

## Commands

```bash
pnpm --filter @corpusai/ai-worker dev    # Dev (tsx watch)
```

Experiment scripts in `src/experiments/` — read `.env` for `OPENAI_API_KEY`, `QDRANT_URL`.

## Checklist

- [ ] Error handling with re-throw for BullMQ retry
- [ ] Progress published at each stage
- [ ] DB updated on success AND failure
- [ ] No PII in logs
- [ ] Graceful shutdown (SIGTERM/SIGINT)
