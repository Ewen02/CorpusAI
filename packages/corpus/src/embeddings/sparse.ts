import { get_encoding, type Tiktoken } from 'tiktoken';
import type { SparseVector } from '../vector-store/types';

/**
 * Generates sparse vectors from text for hybrid search in Qdrant.
 *
 * Uses tiktoken (cl100k_base) to tokenize text, then computes log-TF
 * (term frequency) weights. Qdrant applies IDF server-side via the
 * `idf` modifier on the sparse vector index, yielding full BM25-like scoring.
 *
 * @example
 * ```typescript
 * const generator = new SparseVectorGenerator();
 * const sparse = generator.generate('hello world hello');
 * // sparse.indices = [token_id_hello, token_id_world]
 * // sparse.values  = [log(1 + 2), log(1 + 1)]  (log-TF)
 *
 * generator.dispose(); // free tiktoken resources
 * ```
 */
export class SparseVectorGenerator {
  private encoding: Tiktoken;

  constructor() {
    this.encoding = get_encoding('cl100k_base');
  }

  /**
   * Generate a sparse vector from text.
   * Returns token indices and log-TF weights.
   */
  generate(text: string): SparseVector {
    const tokens = this.encoding.encode(text);
    const termFreqs = new Map<number, number>();

    for (const token of tokens) {
      termFreqs.set(token, (termFreqs.get(token) ?? 0) + 1);
    }

    const indices: number[] = [];
    const values: number[] = [];

    for (const [tokenId, freq] of termFreqs) {
      indices.push(tokenId);
      values.push(Math.log1p(freq)); // log(1 + TF)
    }

    return { indices, values };
  }

  /**
   * Generate sparse vectors for a batch of texts.
   */
  generateBatch(texts: string[]): SparseVector[] {
    return texts.map((text) => this.generate(text));
  }

  /**
   * Free tiktoken resources.
   */
  dispose(): void {
    this.encoding.free();
  }
}
