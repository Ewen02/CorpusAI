# Module 5 : Services Production

## Objectif
Transformer les expériences des modules 1-4 en **services réutilisables** dans `packages/corpus/`.

---

## Architecture

```
packages/corpus/
├── src/
│   ├── index.ts                    # Export public
│   │
│   ├── chunking/                   # Stratégies de chunking
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── recursive.ts            # Chunking récursif (production)
│   │   ├── markdown.ts             # Document-Aware Markdown
│   │   └── semantic.ts             # Semantic chunking
│   │
│   ├── embeddings/                 # Service d'embeddings
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── openai.ts               # Implémentation OpenAI
│   │
│   ├── vector-store/               # Abstraction Qdrant
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── qdrant.ts               # Implémentation Qdrant
│   │
│   └── rag/                        # Pipeline RAG complet
│       ├── index.ts
│       ├── types.ts
│       └── pipeline.ts             # RAGPipeline class
│
├── package.json
└── tsconfig.json
```

---

## Principes de conception

### 1. Injection de dépendances

```typescript
// ❌ Mauvais : dépendance directe
class RAGPipeline {
  private openai = new OpenAI();  // Couplage fort
}

// ✅ Bon : injection
class RAGPipeline {
  constructor(
    private embeddings: EmbeddingService,
    private vectorStore: VectorStoreService,
    private llm: LLMService
  ) {}
}
```

### 2. Interfaces abstraites

```typescript
// Interface générique
interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// Implémentation spécifique
class OpenAIEmbeddingService implements EmbeddingService {
  // ...
}
```

### 3. Configuration explicite

```typescript
// Toute config passée au constructeur
const qdrant = new QdrantVectorStore({
  url: process.env.QDRANT_URL!,
  collectionName: 'documents',
});
```

---

## Services à implémenter

### 1. EmbeddingService

```typescript
interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[], batchSize?: number): Promise<number[][]>;
  readonly dimensions: number;
  readonly model: string;
}

class OpenAIEmbeddingService implements EmbeddingService {
  readonly dimensions = 1536;
  readonly model = 'text-embedding-3-small';

  constructor(private apiKey: string) {}

  async embed(text: string): Promise<number[]> { /* ... */ }
  async embedBatch(texts: string[], batchSize = 100): Promise<number[][]> { /* ... */ }
}
```

### 2. VectorStoreService

```typescript
interface VectorStoreService {
  upsert(points: VectorPoint[]): Promise<void>;
  search(vector: number[], options: SearchOptions): Promise<SearchResult[]>;
  delete(filter: FilterCondition): Promise<void>;
  ensureCollection(): Promise<void>;
}

interface SearchOptions {
  limit: number;
  scoreThreshold?: number;
  filter?: FilterCondition;
  withPayload?: boolean;
}

class QdrantVectorStore implements VectorStoreService {
  constructor(private config: QdrantConfig) {}
  // ...
}
```

### 3. ChunkingService

```typescript
interface ChunkingService {
  chunk(text: string): Chunk[];
  chunkWithMetadata(text: string, metadata: Record<string, unknown>): Chunk[];
}

interface Chunk {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  index: number;
}

class RecursiveChunker implements ChunkingService {
  constructor(private options: ChunkingOptions) {}
  // ...
}
```

### 4. RAGPipeline

```typescript
interface RAGPipeline {
  index(documents: Document[]): Promise<IndexResult>;
  query(question: string, options?: QueryOptions): Promise<RAGResponse>;
  queryStream(question: string, options?: QueryOptions): AsyncGenerator<string>;
}

interface RAGResponse {
  answer: string;
  sources: Source[];
  context: string[];
}

class RAGPipelineImpl implements RAGPipeline {
  constructor(
    private embeddings: EmbeddingService,
    private vectorStore: VectorStoreService,
    private chunker: ChunkingService,
    private llmConfig: LLMConfig
  ) {}
  // ...
}
```

---

## Utilisation finale

```typescript
// apps/ai-worker/src/services/rag.ts
import {
  RAGPipeline,
  OpenAIEmbeddingService,
  QdrantVectorStore,
  RecursiveChunker,
} from '@corpusai/corpus';

// Configuration
const embeddings = new OpenAIEmbeddingService(process.env.OPENAI_API_KEY!);
const vectorStore = new QdrantVectorStore({
  url: process.env.QDRANT_URL!,
  collectionName: 'workspace-123',
});
const chunker = new RecursiveChunker({
  chunkSize: 500,
  overlap: 100,
});

// Pipeline
const rag = new RAGPipeline(embeddings, vectorStore, chunker, {
  model: 'gpt-4o-mini',
  temperature: 0.2,
  systemPrompt: 'Tu es un assistant expert...',
});

// Utilisation
const response = await rag.query('Qu'est-ce que TypeScript ?');
console.log(response.answer);
console.log('Sources:', response.sources);
```

---

## Avantages de cette architecture

| Aspect | Bénéfice |
|--------|----------|
| **Testabilité** | Mock facile des services |
| **Flexibilité** | Changer OpenAI → Cohere sans toucher au code |
| **Réutilisabilité** | Même code pour api, ai-worker, etc. |
| **Maintenance** | Un seul endroit à mettre à jour |
| **Typage** | TypeScript strict, pas d'erreurs runtime |

---

## Checklist d'implémentation

- [ ] Créer `packages/corpus/package.json`
- [ ] Créer les types de base (`types.ts`)
- [ ] Implémenter `EmbeddingService` (OpenAI)
- [ ] Implémenter `VectorStoreService` (Qdrant)
- [ ] Implémenter `ChunkingService` (Recursive, Markdown)
- [ ] Implémenter `RAGPipeline`
- [ ] Exporter tout depuis `index.ts`
- [ ] Tester avec un script dans ai-worker
