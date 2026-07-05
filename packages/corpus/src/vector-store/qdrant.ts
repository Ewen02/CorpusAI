import { QdrantClient } from '@qdrant/js-client-rest';
import type {
  VectorStoreService,
  HybridVectorPoint,
  SparseVector,
  SearchResult,
  SearchOptions,
  FilterCondition,
  QdrantConfig,
} from './types';

const DEFAULT_COLLECTION = 'corpus_vectors';
const DEFAULT_VECTOR_SIZE = 512;
const DEFAULT_TIMEOUT = 30_000;

/**
 * Service de stockage vectoriel utilisant Qdrant.
 *
 * Architecture:
 * - Collection globale unique avec multi-tenancy via filtre `ai_id` + is_tenant
 * - Hybrid search: dense (512d Matryoshka) + sparse (BM25 IDF natif Qdrant)
 * - Scalar quantization int8 (4x memory reduction, <1% recall loss)
 * - HNSW per-tenant (payload_m=16, no global graph)
 * - Payload indexes: ai_id (is_tenant), documentId (keyword)
 *
 * @example
 * ```typescript
 * const vectorStore = new QdrantVectorStore({
 *   url: 'http://localhost:6333',
 * });
 *
 * await vectorStore.ensureCollection();
 *
 * await vectorStore.upsert([{
 *   id: '1',
 *   denseVector: [...],
 *   sparseVector: { indices: [...], values: [...] },
 *   payload: { ai_id: 'abc', text: '...', documentId: 'doc1', source: 'file.pdf', chunkIndex: 0 },
 * }], true);
 *
 * const results = await vectorStore.hybridSearch(denseVec, sparseVec, 'abc', { limit: 5 });
 * ```
 */
export class QdrantVectorStore implements VectorStoreService {
  private client: QdrantClient;
  readonly collectionName: string;
  private vectorSize: number;

  constructor(config: QdrantConfig) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
    });
    this.collectionName = config.collectionName ?? DEFAULT_COLLECTION;
    this.vectorSize = config.vectorSize ?? DEFAULT_VECTOR_SIZE;
  }

  /**
   * Ensures the global collection exists with the full target configuration:
   * - Named dense vectors (512d, Cosine, on_disk)
   * - Named sparse vectors (IDF modifier for BM25)
   * - Scalar quantization (int8, always_ram)
   * - HNSW per-tenant (payload_m=16, ef_construct=128)
   * - Payload indexes: ai_id (is_tenant), documentId (keyword)
   */
  async ensureCollection(): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === this.collectionName);

    if (!exists) {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          dense: {
            size: this.vectorSize,
            distance: 'Cosine',
            on_disk: true,
          },
        },
        sparse_vectors: {
          sparse: {
            index: { on_disk: false },
            modifier: 'idf',
          },
        },
        hnsw_config: {
          m: 0,
          payload_m: 16,
          ef_construct: 128,
        },
        quantization_config: {
          scalar: {
            type: 'int8',
            quantile: 0.99,
            always_ram: true,
          },
        },
      });

      // Payload indexes — created immediately after collection for best performance
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'ai_id',
        field_schema: {
          type: 'keyword',
          is_tenant: true,
        },
      });

      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'documentId',
        field_schema: 'keyword',
      });
    }
  }

  /**
   * Upserts hybrid vector points (dense + sparse) in batch.
   * @param points - Points with dense vector, sparse vector, and payload (including ai_id)
   * @param isLastBatch - If true, waits for persistence (default: false for throughput)
   */
  async upsert(points: HybridVectorPoint[], isLastBatch = false): Promise<void> {
    if (points.length === 0) return;

    await this.client.upsert(this.collectionName, {
      wait: isLastBatch,
      points: points.map((p) => ({
        id: p.id,
        vector: {
          dense: p.denseVector,
          sparse: {
            indices: p.sparseVector.indices,
            values: p.sparseVector.values,
          },
        },
        payload: p.payload,
      })),
    });
  }

  /**
   * Hybrid search combining dense and sparse vectors with RRF fusion.
   * Automatically filters by tenant (aiId) using the is_tenant index.
   *
   * IMPORTANT (scale caveat) : `options.scoreThreshold` s'applique au prefetch DENSE
   * (échelle cosinus 0-1, où un seuil est significatif), PAS au score de fusion RRF
   * final (échelle ~0-0.4). Appliquer le seuil sur le RRF viderait les résultats à tort.
   * `options.filter` est fusionné dans le `must[]` du filtre tenant (les deux prefetch).
   */
  async hybridSearch(
    denseVector: number[],
    sparseVector: SparseVector,
    aiId: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    // Filtre tenant + filtres additionnels optionnels convertis au format Qdrant.
    const tenantFilter = this.buildSearchFilter(aiId, options.filter);

    const results = await this.client.query(this.collectionName, {
      prefetch: [
        {
          query: denseVector,
          using: 'dense',
          limit: 20,
          filter: tenantFilter,
          // Seuil appliqué ici (échelle cosinus dense) et non sur la fusion RRF.
          ...(options.scoreThreshold !== undefined && {
            score_threshold: options.scoreThreshold,
          }),
        },
        {
          query: {
            indices: sparseVector.indices,
            values: sparseVector.values,
          },
          using: 'sparse',
          limit: 20,
          filter: tenantFilter,
        },
      ],
      query: { fusion: 'rrf' },
      limit: options.limit,
      with_payload: options.withPayload ?? true,
      params: {
        hnsw_ef: 128,
        quantization: {
          rescore: true,
          oversampling: 2.0,
        },
      },
    });

    return results.points.map((r) => ({
      id: String(r.id),
      score: r.score ?? 0,
      payload: (r.payload as Record<string, unknown>) ?? {},
    }));
  }

  /**
   * Deletes all vectors for a specific document within a tenant.
   * Uses both ai_id and documentId filters for safety.
   */
  async deleteByDocument(aiId: string, documentId: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [
          { key: 'ai_id', match: { value: aiId } },
          { key: 'documentId', match: { value: documentId } },
        ],
      },
    });
  }

  /**
   * Deletes all vectors for an entire AI (tenant).
   */
  async deleteByAI(aiId: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [{ key: 'ai_id', match: { value: aiId } }],
      },
    });
  }

  /**
   * Builds the Qdrant search filter: the mandatory tenant clause (ai_id) plus any
   * additional user-provided filter, merged into a single filter object.
   *
   * The tenant clause is always in `must[]` (multi-tenancy is non-negotiable). The
   * user filter's `must` clauses are appended to that same `must[]`; its `should` /
   * `must_not` clauses are carried over as-is.
   */
  private buildSearchFilter(aiId: string, filter?: FilterCondition): Record<string, unknown> {
    const must: Record<string, unknown>[] = [{ key: 'ai_id', match: { value: aiId } }];

    if (filter?.must) {
      for (const clause of filter.must) {
        must.push(this.convertClause(clause));
      }
    }

    const qdrantFilter: Record<string, unknown> = { must };

    if (filter?.should) {
      qdrantFilter.should = filter.should.map((clause) => this.convertClause(clause));
    }

    if (filter?.must_not) {
      qdrantFilter.must_not = filter.must_not.map((clause) => this.convertClause(clause));
    }

    return qdrantFilter;
  }

  /**
   * Converts a single filter clause to Qdrant format.
   */
  private convertClause(clause: {
    key: string;
    match?: { value: string | number | boolean };
    range?: { gte?: number; lte?: number; gt?: number; lt?: number };
  }): Record<string, unknown> {
    if (clause.match) {
      return { key: clause.key, match: clause.match };
    }

    if (clause.range) {
      return { key: clause.key, range: clause.range };
    }

    return { key: clause.key };
  }
}
