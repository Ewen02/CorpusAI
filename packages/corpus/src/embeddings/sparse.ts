import { get_encoding, type Tiktoken } from 'tiktoken';
import type { SparseVector } from '../vector-store/types';

/**
 * Stopwords FR/EN à haute fréquence — retirés avant tokenisation en mode
 * `normalize` pour que le matching lexical (BM25) porte sur les termes
 * porteurs de sens plutôt que sur les mots-outils.
 */
const STOPWORDS = new Set([
  // Français
  'le',
  'la',
  'les',
  'un',
  'une',
  'des',
  'du',
  'de',
  'au',
  'aux',
  'ce',
  'cet',
  'cette',
  'ces',
  'mon',
  'ma',
  'mes',
  'ton',
  'ta',
  'tes',
  'son',
  'sa',
  'ses',
  'notre',
  'nos',
  'votre',
  'vos',
  'leur',
  'leurs',
  'je',
  'tu',
  'il',
  'elle',
  'on',
  'nous',
  'vous',
  'ils',
  'elles',
  'qui',
  'que',
  'quoi',
  'dont',
  'ou',
  'et',
  'mais',
  'donc',
  'or',
  'ni',
  'car',
  'si',
  'ne',
  'pas',
  'plus',
  'moins',
  'tres',
  'bien',
  'aussi',
  'comme',
  'dans',
  'sur',
  'sous',
  'avec',
  'sans',
  'pour',
  'par',
  'en',
  'vers',
  'chez',
  'entre',
  'est',
  'sont',
  'etre',
  'avoir',
  'fait',
  'faire',
  'peut',
  'doit',
  'sera',
  'ete',
  'ont',
  'aura',
  // Anglais
  'the',
  'a',
  'an',
  'of',
  'to',
  'in',
  'on',
  'at',
  'by',
  'for',
  'with',
  'without',
  'and',
  'or',
  'but',
  'not',
  'no',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'can',
  'could',
  'shall',
  'should',
  'may',
  'might',
  'must',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'they',
  'them',
  'their',
  'there',
  'here',
  'what',
  'which',
  'who',
  'whom',
  'whose',
  'when',
  'where',
  'how',
  'why',
]);

/** Options du générateur de vecteurs sparse */
export interface SparseVectorGeneratorOptions {
  /**
   * Normalise le texte avant tokenisation : minuscules, dé-accentuation,
   * retrait des stopwords FR/EN. Améliore le matching lexical (BM25) — sans
   * normalisation, « Licenciement » et « licenciement » produisent des tokens
   * tiktoken différents et ne matchent pas.
   *
   * ⚠️ Les vecteurs indexés et les requêtes doivent utiliser le MÊME mode :
   * activer la normalisation sur un corpus indexé sans elle dégrade le
   * matching lexical jusqu'à ré-indexation. Défaut: false.
   */
  normalize?: boolean;
}

/**
 * Generates sparse vectors from text for hybrid search in Qdrant.
 *
 * Uses tiktoken (cl100k_base) to tokenize text, then computes log-TF
 * (term frequency) weights. Qdrant applies IDF server-side via the
 * `idf` modifier on the sparse vector index, yielding full BM25-like scoring.
 *
 * @example
 * ```typescript
 * const generator = new SparseVectorGenerator({ normalize: true });
 * const sparse = generator.generate('hello world hello');
 * // sparse.indices = [token_id_hello, token_id_world]
 * // sparse.values  = [log(1 + 2), log(1 + 1)]  (log-TF)
 *
 * generator.dispose(); // free tiktoken resources
 * ```
 */
export class SparseVectorGenerator {
  private encoding: Tiktoken;
  private readonly normalize: boolean;

  constructor(options: SparseVectorGeneratorOptions = {}) {
    this.encoding = get_encoding('cl100k_base');
    this.normalize = options.normalize ?? false;
  }

  /**
   * Generate a sparse vector from text.
   * Returns token indices and log-TF weights.
   */
  generate(text: string): SparseVector {
    const input = this.normalize ? this.normalizeText(text) : text;
    const tokens = this.encoding.encode(input);
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
   * Minuscules + dé-accentuation + retrait des stopwords FR/EN.
   * Les nombres sont préservés (tokens séparés : « 11,88 » → « 11 88 »),
   * essentiel pour les corpus chiffrés (tarifs, seuils, dates).
   */
  private normalizeText(text: string): string {
    const folded = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return folded
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 1 && !STOPWORDS.has(word))
      .join(' ');
  }

  /**
   * Free tiktoken resources.
   */
  dispose(): void {
    this.encoding.free();
  }
}
