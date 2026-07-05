/**
 * Default RAG query configuration shared across API and Worker.
 * Single source of truth to avoid config drift between services
 * (same pattern as CHUNKER_DEFAULTS for chunking).
 *
 * `scoreThreshold` applies to the DENSE prefetch (cosine scale 0-1) — see
 * `QdrantVectorStore.hybridSearch`. 0.4 is calibrated for 512d Matryoshka
 * embeddings, whose cosine scores run lower than full 1536d vectors.
 */
export const RAG_QUERY_DEFAULTS = {
  scoreThreshold: 0.4,
  /** Nombre de résultats gardés après reranking (contexte LLM) */
  topN: 3,
} as const;
