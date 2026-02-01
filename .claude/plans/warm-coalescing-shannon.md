# Plan: Background Workers (BullMQ)

## Objectif

Remplacer le processing synchrone de documents (fire-and-forget dans l'API) par une job queue BullMQ + worker dédié.

---

## Architecture cible

```
API (NestJS)                    Redis (BullMQ)              Worker (ai-worker)
─────────────                   ──────────────              ──────────────────
POST /documents/upload  ──►  queue.add(job)  ──►  Worker picks up job
                                    │                     │
                              pub/sub progress  ◄──  processDocument()
                                    │                (parse → chunk → embed → store)
                                    ▼
SSE /documents/:id/progress  ◄──  subscribe
```

---

## Étapes d'implémentation

### 1. Créer `packages/queue/`

Nouveau package minimal — types partagés + queue factory.

```
packages/queue/
├── package.json          # bullmq, ioredis
├── tsconfig.json
└── src/
    ├── index.ts
    ├── types.ts          # DocumentProcessingJobData, DocumentProgressEvent
    ├── constants.ts      # QUEUE_NAMES, REDIS_CHANNELS, JOB_RETRY_CONFIG
    └── client.ts         # createDocumentQueue() factory
```

**Types clés :**
```typescript
interface DocumentProcessingJobData {
  documentId: string;
  aiId: string;
  filename: string;
  mimeType: string;
  url?: string;
  content?: string;
  buffer?: string; // base64
}

const JOB_RETRY_CONFIG = { attempts: 3, backoff: { type: 'exponential', delay: 5000 } };
const REDIS_CHANNELS = { DOCUMENT_PROGRESS: 'doc-progress' };
```

**Fichiers :** `packages/queue/package.json`, `packages/queue/tsconfig.json`, `packages/queue/src/index.ts`, `types.ts`, `constants.ts`, `client.ts`

### 2. Modifier l'API — dispatch au lieu de process

**Fichier principal :** `apps/api/src/modules/documents/documents.service.ts`

- Supprimer `processDocument()`, `processDocumentFromBuffer()`, `processDocumentWithContent()`, `processDocumentInternal()`
- Supprimer `EventEmitter` et `progressEmitter`
- Supprimer `DocumentParserService` (déplacé dans le worker)
- Injecter `Queue<DocumentProcessingJobData>` via NestJS provider
- Les 3 méthodes de création (`create`, `createFromUpload`, `createFromText`) font `queue.add()` au lieu de fire-and-forget
- Pour `createFromUpload` : encoder le buffer en base64 dans le job data
- Garder `updateProgress()` et `updateStatus()` pour les appels depuis retryProcessing

**Fichier :** `apps/api/src/modules/documents/documents.module.ts`
- Ajouter provider `DOCUMENT_QUEUE` via factory (createDocumentQueue)
- Ajouter provider `REDIS_SUBSCRIBER` pour le SSE

**Fichier :** `apps/api/src/modules/documents/documents.controller.ts`
- SSE `streamProgress` : remplacer EventEmitter par Redis pub/sub subscriber
- Créer un subscriber Redis dédié par connexion SSE
- Filtrer les events par documentId
- Cleanup subscriber on disconnect

**Fichier :** `apps/api/package.json`
- Ajouter `"@corpusai/queue": "workspace:*"`, `"bullmq": "^5.0.0"`

### 3. Implémenter le worker dans `apps/ai-worker/`

**Structure :**
```
apps/ai-worker/src/
├── index.ts                       # Entry: démarre le worker BullMQ
├── worker.ts                      # Config BullMQ Worker (concurrency: 3)
├── processors/
│   └── document-processor.ts      # Logique: parse → index via RAG pipeline
├── services/
│   ├── progress.service.ts        # Redis pub/sub pour progress events
│   └── rag-factory.service.ts     # Crée RAGPipeline par AI (même logique que API)
└── experiments/                   # Garder les scripts existants
```

**`document-processor.ts`** — cœur du worker :
1. Update DB : status=PROCESSING, processingStartedAt
2. Parse le document (buffer base64 → Buffer, ou URL, ou text content)
3. Appeler `ragPipeline.index()` avec progress callback
4. Update DB : status=INDEXED, chunkCount, processingCompletedAt
5. En cas d'erreur : status=FAILED, errorMessage, re-throw pour retry BullMQ

**`rag-factory.service.ts`** — réplique de `apps/api/src/modules/rag/rag-pipeline.factory.ts` en version standalone (pas NestJS). Partage les mêmes services (embeddings, chunker, reranker, vector store).

**`progress.service.ts`** — publie les events sur Redis channel `doc-progress`

**Fichier :** `apps/ai-worker/package.json`
- Ajouter : `@corpusai/queue`, `@corpusai/database`, `bullmq`, `ioredis`

### 4. Config monorepo

**`turbo.json`** — ajouter ai-worker au pipeline build
**`package.json` (root)** — ajouter scripts `worker:dev`, `worker:start`
**`apps/ai-worker/.env.example`** — DATABASE_URL, REDIS_URL, OPENAI_API_KEY, QDRANT_URL

### 5. Retry / Dead-letter

- BullMQ built-in : 3 attempts, exponential backoff (5s, 10s, 20s)
- Jobs failed après 3 retries → restent en "failed" state dans la queue
- `retryProcessing()` dans documents.service.ts : re-add le job à la queue
- Dead-letter : on peut ajouter un listener `worker.on('failed')` pour logger/alerter

---

## Fichiers modifiés (résumé)

| Fichier | Action |
|---------|--------|
| `packages/queue/` (nouveau) | Types, constants, queue factory |
| `apps/api/src/modules/documents/documents.service.ts` | Supprimer processing sync, ajouter queue dispatch |
| `apps/api/src/modules/documents/documents.controller.ts` | SSE via Redis pub/sub |
| `apps/api/src/modules/documents/documents.module.ts` | Providers queue + Redis |
| `apps/api/package.json` | Deps queue + bullmq |
| `apps/ai-worker/src/index.ts` | Worker entry point |
| `apps/ai-worker/src/worker.ts` | BullMQ Worker config |
| `apps/ai-worker/src/processors/document-processor.ts` | Processing logic |
| `apps/ai-worker/src/services/progress.service.ts` | Redis progress publisher |
| `apps/ai-worker/src/services/rag-factory.service.ts` | Pipeline factory standalone |
| `apps/ai-worker/package.json` | Deps |
| `turbo.json` | Build pipeline |
| `package.json` (root) | Scripts worker |

---

## Vérification

1. `pnpm build` — tous les packages compilent
2. `pnpm test` dans packages/corpus — tests existants passent
3. Démarrer API + Worker + Redis localement
4. Upload un document → vérifier qu'il est dispatché dans la queue
5. Worker le process → DB passe à INDEXED
6. SSE progress stream reçoit les events en temps réel
7. Tuer le worker pendant un processing → job reste dans la queue → redémarrer → job reprend
8. Simuler 3 échecs → job passe en failed → retryProcessing() relance
