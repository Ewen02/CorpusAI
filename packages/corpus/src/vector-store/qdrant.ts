import { QdrantClient } from '@qdrant/js-client-rest';
import type {
  VectorStoreService,
  VectorPoint,
  SearchResult,
  SearchOptions,
  FilterCondition,
  QdrantConfig,
} from './types';

/**
 * Service de stockage vectoriel utilisant Qdrant.
 *
 * @example
 * ```typescript
 * const vectorStore = new QdrantVectorStore({
 *   url: 'http://localhost:6333',
 *   collectionName: 'documents',
 *   vectorSize: 1536,
 * });
 *
 * await vectorStore.ensureCollection();
 * await vectorStore.upsert([{ id: '1', vector: [...], payload: { text: '...' } }]);
 *
 * const results = await vectorStore.search(queryVector, { limit: 5 });
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
    });
    this.collectionName = config.collectionName;
    this.vectorSize = config.vectorSize;
  }

  /**
   * S'assure que la collection existe, la crée si nécessaire.
   */
  async ensureCollection(): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === this.collectionName
    );

    if (!exists) {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine',
        },
      });
    }
  }

  /**
   * Insère ou met à jour des points vectoriels en batch.
   */
  async upsert(points: VectorPoint[]): Promise<void> {
    if (points.length === 0) return;

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  }

  /**
   * Recherche les vecteurs les plus similaires.
   */
  async search(vector: number[], options: SearchOptions): Promise<SearchResult[]> {
    const results = await this.client.search(this.collectionName, {
      vector,
      limit: options.limit,
      score_threshold: options.scoreThreshold,
      filter: options.filter ? this.convertFilter(options.filter) : undefined,
      with_payload: options.withPayload ?? true,
    });

    return results.map((r) => ({
      id: String(r.id),
      score: r.score,
      payload: (r.payload as Record<string, unknown>) ?? {},
    }));
  }

  /**
   * Supprime des points selon un filtre.
   */
  async delete(filter: FilterCondition): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      filter: this.convertFilter(filter),
    });
  }

  /**
   * Supprime des points par leurs IDs.
   */
  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await this.client.delete(this.collectionName, {
      wait: true,
      points: ids,
    });
  }

  /**
   * Supprime la collection entière.
   */
  async deleteCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
    } catch {
      // Collection n'existe peut-être pas, on ignore
    }
  }

  /**
   * Convertit notre format de filtre vers le format Qdrant.
   */
  private convertFilter(filter: FilterCondition): Record<string, unknown> {
    const qdrantFilter: Record<string, unknown> = {};

    if (filter.must) {
      qdrantFilter.must = filter.must.map((clause) => this.convertClause(clause));
    }

    if (filter.should) {
      qdrantFilter.should = filter.should.map((clause) => this.convertClause(clause));
    }

    if (filter.must_not) {
      qdrantFilter.must_not = filter.must_not.map((clause) => this.convertClause(clause));
    }

    return qdrantFilter;
  }

  /**
   * Convertit une clause de filtre individuelle.
   */
  private convertClause(clause: { key: string; match?: { value: string | number | boolean }; range?: { gte?: number; lte?: number; gt?: number; lt?: number } }): Record<string, unknown> {
    if (clause.match) {
      return {
        key: clause.key,
        match: clause.match,
      };
    }

    if (clause.range) {
      return {
        key: clause.key,
        range: clause.range,
      };
    }

    return { key: clause.key };
  }
}
