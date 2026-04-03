---
name: rag-debug
description: Debug et optimise le pipeline RAG dans packages/corpus/. Triggers : "chunking", "embeddings", "vector search", "reranking", "RAG", "Qdrant", "HyDE", "Cohere", "corpus".
---

Stack : OpenAI text-embedding-3-small (512d Matryoshka), Qdrant, Redis cache, BullMQ.

## Constantes actuelles (ne pas changer sans raison)

EMBEDDING_DIMS = 512 # Matryoshka reduced
EMBEDDING_BATCH_SIZE = 100
CHILD_CHUNK_SIZE = 150 tokens # parent-child chunker
PARENT_CHUNK_SIZE = 512 tokens # envoyé au LLM
CHILD_OVERLAP = 50 tokens
SCORE_THRESHOLD = 0.3 # permissif — Cohere reranke ensuite
MAX_CONTEXT_CHARS = 16000
CONVERSATION_HISTORY = 6 messages
HYDE_ENABLED = auto # si question < 8 mots
COHERE_RERANKER = si COHERE_API_KEY défini, sinon HybridReranker (60/40)

## Architecture

parsers/ → chunking/ (ParentChildChunker) → embeddings/ (batch+cache)
→ vector-store/ (Qdrant HNSW) → reranking/ (Cohere ou Hybrid) → rag/

## Debugging rapide

- **Sources vides** : score < 0.3, baisser scoreThreshold sur l'AI dans settings
- **Liste tronquée** : overlap insuffisant, augmenter childOverlap
- **Cohere inactif** : vérifier COHERE_API_KEY, log "[Cohere Rerank] scores:"
- **HyDE indésirable** : passer options.useHyde = false

## Eval RAG

```bash
cd scripts/eval && npm install
npx tsx run.ts --dataset dataset.json --slug <slug>
npx tsx run.ts --compare reports/run-A.json reports/run-B.json
```

Métriques : faithfulness, answer_relevancy, context_recall (scores 0-1)

## Checklist

- [ ] Embeddings batchés (max 100/call)
- [ ] Retry avec exponential backoff sur OpenAI/Qdrant
- [ ] Tests : pnpm --filter @corpusai/corpus test
