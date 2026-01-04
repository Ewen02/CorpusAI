# AI/RAG Engineer - CorpusAI

## Spécialisation

Expert en intelligence artificielle et Retrieval-Augmented Generation (RAG) pour CorpusAI. Responsable du pipeline d'embeddings, de la recherche vectorielle et de la génération de réponses contextuelles.

## Workspace

### Packages principaux
- `apps/ai-worker/` - Service Node.js pour les jobs IA
- `packages/corpus/` - Chunking et traitement de documents
- `packages/ai-rules/` - Configuration comportementale des assistants

### Technologies
- OpenAI API (embeddings text-embedding-3-small)
- Qdrant (base de données vectorielle)
- Claude/GPT-4 (LLM pour génération)
- Node.js + TypeScript

## Architecture RAG

```
Document Upload → Chunking → Embeddings → Qdrant
                                            ↓
User Question → Query Embedding → Vector Search → Context
                                                    ↓
                              LLM + Context + System Prompt → Response
```

### Pipeline de traitement
1. **Upload** : Document reçu via API (PDF, TXT, MD...)
2. **Chunking** : Découpage en segments de 500-1000 tokens
3. **Embedding** : Vectorisation avec OpenAI
4. **Indexation** : Stockage dans Qdrant avec métadonnées
5. **Requête** : Embedding de la question utilisateur
6. **Recherche** : Top-K chunks similaires
7. **Génération** : LLM avec contexte + prompt système

## Standards de développement

### Structure ai-worker
```
apps/ai-worker/
├── src/
│   ├── experiments/     # Scripts d'expérimentation
│   │   ├── embeddings.ts
│   │   ├── qdrant.ts
│   │   └── rag.ts
│   ├── services/        # Services production
│   │   ├── embedding.service.ts
│   │   ├── chunking.service.ts
│   │   ├── qdrant.service.ts
│   │   └── rag.service.ts
│   └── index.ts
└── package.json
```

### Package corpus
```
packages/corpus/
├── src/
│   ├── chunking/
│   │   ├── strategies/
│   │   │   ├── fixed-size.ts
│   │   │   ├── semantic.ts
│   │   │   └── recursive.ts
│   │   └── index.ts
│   ├── processing/
│   │   ├── pdf.ts
│   │   ├── markdown.ts
│   │   └── text.ts
│   └── index.ts
```

### Conventions de code

```typescript
// Embedding service
export class EmbeddingService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async embed(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }

  // Batch pour optimisation (max 100 par appel)
  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return response.data.map((d) => d.embedding);
  }
}

// Qdrant service
export class QdrantService {
  private client = new QdrantClient({ url: process.env.QDRANT_URL });

  async createCollection(name: string) {
    await this.client.createCollection(name, {
      vectors: { size: 1536, distance: "Cosine" },
    });
  }

  async upsertPoints(collection: string, points: Point[]) {
    await this.client.upsert(collection, { points });
  }

  async search(collection: string, vector: number[], limit = 5) {
    return this.client.search(collection, {
      vector,
      limit,
      with_payload: true,
    });
  }
}
```

### Chunking strategies

```typescript
// Fixed-size chunking
export function chunkFixedSize(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize - overlap;
  }
  return chunks;
}

// Recursive character splitting (recommandé)
export function chunkRecursive(
  text: string,
  separators = ["\n\n", "\n", ". ", " "],
  chunkSize = 1000,
): string[] {
  // Implémentation récursive...
}
```

### Package ai-rules

```typescript
// Configuration comportementale
export interface AIBehaviorConfig {
  personality: "professional" | "friendly" | "academic";
  responseLength: "concise" | "detailed";
  citeSources: boolean;
  confidenceThreshold: number;
  fallbackBehavior: "apologize" | "redirect" | "generic";
}

// System prompt builder
export function buildSystemPrompt(config: AIBehaviorConfig, context: string): string {
  return `Tu es un assistant IA spécialisé.

Personnalité: ${config.personality}
Style de réponse: ${config.responseLength}

Contexte pertinent:
${context}

Instructions:
- ${config.citeSources ? "Cite tes sources entre [Source: X]" : ""}
- Si tu n'es pas sûr (confiance < ${config.confidenceThreshold}), ${config.fallbackBehavior}
`;
}
```

## Tâches courantes

### Expérimenter avec les embeddings
```bash
pnpm --filter ai-worker experiment:embeddings
```

### Tester Qdrant
```bash
# Démarrer Qdrant (Docker)
docker run -p 6333:6333 qdrant/qdrant

# Exécuter les tests
pnpm --filter ai-worker experiment:qdrant
```

### Implémenter une nouvelle stratégie de chunking
1. Créer le fichier dans `packages/corpus/src/chunking/strategies/`
2. Exporter depuis `packages/corpus/src/index.ts`
3. Tester avec différents types de documents

### Optimiser la recherche vectorielle
- Ajuster le nombre de résultats (top-K)
- Filtrer par métadonnées (documentId, aiId)
- Utiliser le score de similarité pour le seuil de confiance

## Points d'intégration

### Avec Backend Engineer
- Webhook POST `/documents/:id/index` pour déclencher l'indexation
- Endpoint POST `/ais/:id/chat` pour les requêtes RAG
- Modèle `Document` pour les métadonnées
- Modèle `Message` pour l'historique

### Avec Frontend Engineer
- Streaming des réponses (Server-Sent Events ou WebSocket)
- Affichage des sources (`SourceCitation` component)
- Indicateur de confiance dans la réponse

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `apps/ai-worker/src/experiments/` | Scripts d'expérimentation |
| `packages/corpus/src/chunking/` | Stratégies de découpage |
| `packages/ai-rules/src/prompt-builder.ts` | Construction des prompts |
| `packages/ai-rules/src/behavior-rules.ts` | Configuration comportementale |

## Variables d'environnement

```env
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=...  # optionnel, pour Qdrant Cloud
```

## Checklist qualité

- [ ] Batch les embeddings (max 100 par appel API)
- [ ] Gère les erreurs OpenAI (rate limit, timeout)
- [ ] Chunks de taille optimale (500-1000 tokens)
- [ ] Métadonnées complètes dans Qdrant (documentId, aiId, position)
- [ ] Score de confiance dans les réponses
- [ ] Citations des sources quand applicable
- [ ] Streaming pour UX réactive
