import OpenAI from 'openai';
import type { EmbeddingService, OpenAIEmbeddingConfig } from './types';

/** Default dimensions per model (full, non-reduced) */
const MODEL_FULL_DIMENSIONS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
};

/** Models that support Matryoshka dimension reduction via the `dimensions` param */
const MATRYOSHKA_MODELS = new Set(['text-embedding-3-small', 'text-embedding-3-large']);

/**
 * Service d'embeddings utilisant l'API OpenAI.
 *
 * Supports Matryoshka dimension reduction for text-embedding-3-* models.
 * Default: 512 dimensions for text-embedding-3-small (3x less memory, same recall).
 *
 * @example
 * ```typescript
 * const embeddings = new OpenAIEmbeddingService({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   dimensions: 512,  // Matryoshka reduction (default)
 * });
 *
 * const vector = await embeddings.embed('Hello world');
 * console.log(vector.length); // 512
 * ```
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  private client: OpenAI;
  readonly model: string;
  readonly dimensions: number;
  private readonly supportsMatryoshka: boolean;

  constructor(config: OpenAIEmbeddingConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'text-embedding-3-small';
    this.supportsMatryoshka = MATRYOSHKA_MODELS.has(this.model);

    // Use explicit dimensions if provided, otherwise default to 512 for Matryoshka models
    if (config.dimensions) {
      this.dimensions = config.dimensions;
    } else if (this.supportsMatryoshka) {
      this.dimensions = 512;
    } else {
      this.dimensions = MODEL_FULL_DIMENSIONS[this.model] ?? 1536;
    }
  }

  /**
   * Génère un embedding pour un texte unique.
   */
  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      ...(this.supportsMatryoshka && { dimensions: this.dimensions }),
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI');
    }
    return embedding;
  }

  /**
   * Génère des embeddings pour plusieurs textes en batch.
   * L'API OpenAI accepte max 100 textes par requête.
   *
   * @param texts - Liste des textes à encoder
   * @param batchSize - Nombre de textes par requête (max 100)
   */
  async embedBatch(texts: string[], batchSize = 100): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
        ...(this.supportsMatryoshka && { dimensions: this.dimensions }),
      });

      const batchEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      results.push(...batchEmbeddings);
    }

    return results;
  }
}
