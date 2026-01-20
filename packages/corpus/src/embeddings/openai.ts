import OpenAI from 'openai';
import type { EmbeddingService, OpenAIEmbeddingConfig } from './types';

const MODEL_DIMENSIONS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
};

/**
 * Service d'embeddings utilisant l'API OpenAI.
 *
 * @example
 * ```typescript
 * const embeddings = new OpenAIEmbeddingService({
 *   apiKey: process.env.OPENAI_API_KEY!,
 * });
 *
 * const vector = await embeddings.embed('Hello world');
 * console.log(vector.length); // 1536
 * ```
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  private client: OpenAI;
  readonly model: string;
  readonly dimensions: number;

  constructor(config: OpenAIEmbeddingConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'text-embedding-3-small';
    this.dimensions = MODEL_DIMENSIONS[this.model] ?? 1536;
  }

  /**
   * Génère un embedding pour un texte unique.
   */
  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
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

    // Traiter par batches de 100 max (limite OpenAI)
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
      });

      // Les embeddings sont retournés dans le même ordre
      const batchEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      results.push(...batchEmbeddings);
    }

    return results;
  }
}
