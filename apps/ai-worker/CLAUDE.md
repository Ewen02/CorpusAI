# apps/ai-worker — BullMQ Document Processing Worker

## Stack
- BullMQ worker consommant depuis Redis
- `@corpusai/corpus` pour le pipeline RAG complet
- `@corpusai/database` pour Prisma
- `@corpusai/queue` pour les constantes et types de queue

## Architecture

```
API enqueue job -> Redis (BullMQ) -> Worker picks up -> processDocument()
Worker publishes progress -> Redis pub/sub -> API SSE endpoint -> Frontend
```

## Structure

```
src/
├── index.ts                  # Entry point : cree worker, connecte Redis, graceful shutdown
├── worker.ts                 # BullMQ Worker setup, concurrency=3
├── processors/
│   └── document-processor.ts # Pipeline de traitement complet
├── services/
│   ├── progress.service.ts   # Redis pub/sub pour progress events
│   └── rag-factory.ts        # Singleton RAGPipelineImpl par AI
└── experiments/              # Scripts standalone (pas du code production)
    ├── embeddings.ts
    ├── qdrant.ts
    ├── chunking.ts
    ├── rag-pipeline.ts
    └── corpus-test.ts
```

## Document Processing Flow

1. Recevoir `DocumentProcessingJobData` (documentId, aiId, filename, mimeType, content/buffer/url)
2. Marquer le document `PROCESSING` en DB
3. Publier progress SSE a 2%
4. Parser le contenu : texte direct → bypass, buffer/URL → `DocumentParserService` (PDF/DOCX/TXT/MD)
5. Indexer via `pipeline.index()` avec callback de progress (chunking → embedding → storing)
6. Mettre a jour le document : `INDEXED`, chunkCount, wordCount, pageCount, title, author, language
7. En cas d'erreur : marquer `FAILED` avec errorMessage, re-throw pour retry BullMQ

## Progress Stages

| Stage | Range | Description |
|-------|-------|-------------|
| PARSING | 0-10% | Parse du contenu document |
| CHUNKING | ~10% | Decoupage en chunks |
| EMBEDDING | 10-80% | Batch embed avec OpenAI |
| STORING | 80-100% | Upsert dans Qdrant |

## Queue Config (via @corpusai/queue)

- Queue name : `DOCUMENT_PROCESSING`
- Retry : 3 tentatives, backoff exponentiel depuis 5s
- Redis channel progress : `doc-progress`
- Concurrency worker : 3

## Commandes

```bash
pnpm --filter @corpusai/ai-worker dev              # Dev (tsx watch)
pnpm --filter ai-worker experiment:embeddings       # Experimenter embeddings
pnpm --filter ai-worker experiment:qdrant           # Experimenter Qdrant
pnpm --filter ai-worker experiment:rag              # Experimenter RAG pipeline
```

## Fichiers cles

| Fichier | Role |
|---------|------|
| `src/worker.ts` | Creation BullMQ worker et error handling |
| `src/processors/document-processor.ts` | Pipeline complet de traitement |
| `src/services/rag-factory.ts` | Cree les instances pipeline par AI |
| `src/services/progress.service.ts` | Redis pub/sub progress publisher |

## Checklist qualite

- [ ] Error handling avec re-throw pour retry BullMQ
- [ ] Progress publie a chaque stage
- [ ] DB mise a jour en succes ET en echec
- [ ] Pas de PII dans les logs
- [ ] Graceful shutdown (SIGTERM/SIGINT)
