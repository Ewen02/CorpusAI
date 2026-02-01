import { Injectable, Logger } from '@nestjs/common';
import { RagPipelineFactory } from './rag-pipeline.factory';
import type { LLMConfig, RAGResponse, IndexResult, ProgressCallback, CacheMetrics } from '@corpusai/corpus';

export interface DocumentToIndex {
  id: string;
  content: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface QueryOptions {
  topK?: number;
  scoreThreshold?: number;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface DebugQueryResult {
  question: string;
  threshold: number;
  resultsCount: number;
  results: Array<{
    rank: number;
    score: number;
    source: string;
    documentId: string;
    excerpt: string;
  }>;
  analysis: {
    avgScore: number;
    maxScore: number;
    minScore: number;
    allAboveThreshold: boolean;
    recommendation: string;
  };
}

export interface IndexDocumentOptions {
  /** Callback appelé à chaque mise à jour de progression */
  onProgress?: ProgressCallback;
}

/**
 * Service principal pour les opérations RAG.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(private factory: RagPipelineFactory) {}

  /**
   * Indexe un document dans le vector store de l'AI.
   * @param aiId - ID de l'AI
   * @param document - Document à indexer
   * @param options - Options d'indexation (callback de progression)
   */
  async indexDocument(
    aiId: string,
    document: DocumentToIndex,
    options?: IndexDocumentOptions
  ): Promise<IndexResult> {
    this.logger.log(`Indexing document ${document.id} for AI ${aiId}`);

    const pipeline = this.factory.createForAI(aiId);

    const result = await pipeline.index(
      [
        {
          id: document.id,
          content: document.content,
          source: document.source,
          metadata: document.metadata,
        },
      ],
      { onProgress: options?.onProgress }
    );

    this.logger.log(
      `Indexed document ${document.id}: ${result.chunksCreated} chunks created`
    );

    return result;
  }

  /**
   * Pose une question et retourne une réponse avec sources.
   */
  async query(
    aiId: string,
    question: string,
    aiConfig?: Partial<LLMConfig>,
    options?: QueryOptions
  ): Promise<RAGResponse> {
    this.logger.log(`Query for AI ${aiId}: "${question.slice(0, 50)}..."`);

    const pipeline = this.factory.createForAI(aiId, aiConfig);

    const response = await pipeline.query(question, {
      topK: options?.topK,
      scoreThreshold: options?.scoreThreshold,
      includeSources: true,
      conversationHistory: options?.conversationHistory,
    });

    this.logger.log(
      `Query response: ${response.sources.length} sources, answer length: ${response.answer.length}`
    );

    return response;
  }

  /**
   * Pose une question avec streaming de la réponse.
   */
  async *queryStream(
    aiId: string,
    question: string,
    aiConfig?: Partial<LLMConfig>,
    options?: QueryOptions
  ): AsyncGenerator<string, RAGResponse> {
    this.logger.log(`Query stream for AI ${aiId}: "${question.slice(0, 50)}..."`);

    const pipeline = this.factory.createForAI(aiId, aiConfig);

    const generator = pipeline.queryStream(question, {
      topK: options?.topK,
      scoreThreshold: options?.scoreThreshold,
      includeSources: true,
      conversationHistory: options?.conversationHistory,
    });

    let result: IteratorResult<string, RAGResponse>;
    while (!(result = await generator.next()).done) {
      yield result.value;
    }

    this.logger.log(
      `Query stream complete: ${result.value.sources.length} sources, answer length: ${result.value.answer.length}`
    );

    return result.value;
  }

  /**
   * Supprime les vecteurs d'un document du vector store.
   */
  async deleteDocumentVectors(aiId: string, documentId: string): Promise<void> {
    this.logger.log(`Deleting vectors for document ${documentId} from AI ${aiId}`);

    const vectorStore = this.factory.createVectorStoreForAI(aiId);

    await vectorStore.delete({
      must: [{ key: 'documentId', match: { value: documentId } }],
    });

    this.logger.log(`Vectors deleted for document ${documentId}`);
  }

  /**
   * Supprime toute la collection Qdrant d'une AI.
   */
  async deleteAICollection(aiId: string): Promise<void> {
    this.logger.log(`Deleting entire collection for AI ${aiId}`);

    const vectorStore = this.factory.createVectorStoreForAI(aiId);

    try {
      await vectorStore.deleteCollection();
      this.logger.log(`Collection deleted for AI ${aiId}`);
    } catch (error) {
      // Collection might not exist, that's okay
      this.logger.warn(`Could not delete collection for AI ${aiId}: ${error}`);
    }
  }

  /**
   * Retourne les métriques du cache d'embeddings.
   */
  getCacheMetrics(): CacheMetrics | null {
    return this.factory.getCacheMetrics();
  }

  /**
   * Indique si le cache Redis est actif.
   */
  isCacheEnabled(): boolean {
    return this.factory.isCacheEnabled;
  }

  /**
   * Debug query : retourne uniquement les sources récupérées sans appel LLM.
   * Utile pour diagnostiquer les problèmes de retrieval.
   */
  async debugQuery(
    aiId: string,
    question: string,
    options?: QueryOptions
  ): Promise<DebugQueryResult> {
    this.logger.log(`Debug query for AI ${aiId}: "${question.slice(0, 50)}..."`);

    const threshold = options?.scoreThreshold ?? 0.6;
    const topK = options?.topK ?? 5;

    // Embed la question
    const embeddingService = this.factory.getEmbeddingService();
    const questionEmbedding = await embeddingService.embed(question);

    // Recherche vectorielle
    const vectorStore = this.factory.createVectorStoreForAI(aiId);
    const results = await vectorStore.search(questionEmbedding, {
      limit: topK,
      scoreThreshold: 0.0, // Pas de filtre pour voir tous les résultats
      withPayload: true,
    });

    // Formater les résultats
    const formattedResults = results.map((r, index) => ({
      rank: index + 1,
      score: r.score,
      source: (r.payload.source as string) || 'unknown',
      documentId: (r.payload.documentId as string) || 'unknown',
      excerpt: ((r.payload.text as string) || '').slice(0, 300) + '...',
    }));

    // Calculer les métriques
    const scores = results.map((r) => r.score);
    const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const aboveThreshold = results.filter((r) => r.score >= threshold).length;

    // Générer une recommandation
    let recommendation: string;
    if (results.length === 0) {
      recommendation = 'Aucun document trouvé. Vérifiez que des documents sont indexés.';
    } else if (maxScore < 0.4) {
      recommendation = 'Scores très bas. La question ne correspond pas aux documents indexés.';
    } else if (maxScore < threshold) {
      recommendation = `Score max (${maxScore.toFixed(2)}) sous le seuil (${threshold}). Reformulez la question ou ajoutez des documents pertinents.`;
    } else if (avgScore < 0.5) {
      recommendation = 'Score moyen faible. Les résultats sont partiellement pertinents.';
    } else {
      recommendation = 'Bonne pertinence. Les documents correspondent à la question.';
    }

    this.logger.log(
      `Debug query: ${results.length} results, avgScore: ${avgScore.toFixed(2)}, aboveThreshold: ${aboveThreshold}`
    );

    // Log détaillé pour debug
    this.logger.log(`Debug query details for "${question.slice(0, 30)}...":`);
    formattedResults.forEach((r) => {
      this.logger.log(`  #${r.rank} score=${r.score.toFixed(4)} source="${r.source}" excerpt="${r.excerpt.slice(0, 100)}..."`);
    });

    return {
      question,
      threshold,
      resultsCount: results.length,
      results: formattedResults,
      analysis: {
        avgScore,
        maxScore,
        minScore,
        allAboveThreshold: aboveThreshold === results.length && results.length > 0,
        recommendation,
      },
    };
  }
}
