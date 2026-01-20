/**
 * Interface abstraite pour un service d'embeddings.
 * Permet de changer de provider (OpenAI, Cohere, etc.) sans modifier le code.
 */
export interface EmbeddingService {
  /**
   * Génère un embedding pour un texte.
   */
  embed(text: string): Promise<number[]>;

  /**
   * Génère des embeddings pour plusieurs textes en batch.
   * Plus efficace que d'appeler embed() en boucle.
   */
  embedBatch(texts: string[], batchSize?: number): Promise<number[][]>;

  /**
   * Nombre de dimensions du vecteur (ex: 1536 pour text-embedding-3-small)
   */
  readonly dimensions: number;

  /**
   * Nom du modèle utilisé
   */
  readonly model: string;
}

/**
 * Configuration pour le service OpenAI
 */
export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
}
