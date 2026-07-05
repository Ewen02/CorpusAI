import { Injectable, Logger } from '@nestjs/common';
import { RagPipelineFactory } from './rag-pipeline.factory';
import { SemanticAnswerCacheService } from './semantic-answer-cache.service';
import { trace } from '../../lib/tracing';
import {
  RAG_QUERY_DEFAULTS,
  type LLMConfig,
  type RAGResponse,
  type IndexResult,
  type ProgressCallback,
  type CacheMetrics,
} from '@corpusai/corpus';

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

  constructor(
    private factory: RagPipelineFactory,
    private readonly answerCache: SemanticAnswerCacheService
  ) {}

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

    const result = await trace(
      'document.process',
      { aiId, documentId: document.id, contentBytes: document.content.length },
      () =>
        pipeline.index(
          [
            {
              id: document.id,
              content: document.content,
              source: document.source,
              metadata: document.metadata,
            },
          ],
          { onProgress: options?.onProgress }
        )
    );

    this.logger.log(`Indexed document ${document.id}: ${result.chunksCreated} chunks created`);

    // Corpus modifié → les réponses en cache ne sont plus fiables
    await this.answerCache.invalidate(aiId);

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

    const response = await trace(
      'rag.pipeline',
      {
        aiId,
        questionLength: question.length,
        topK: options?.topK,
        scoreThreshold: options?.scoreThreshold,
        historyTurns: options?.conversationHistory?.length,
      },
      () =>
        pipeline.query(question, {
          topK: options?.topK,
          scoreThreshold: options?.scoreThreshold,
          includeSources: true,
          conversationHistory: options?.conversationHistory,
        })
    );

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

    const vectorStore = this.factory.getVectorStore();
    await vectorStore.deleteByDocument(aiId, documentId);
    await this.answerCache.invalidate(aiId);

    this.logger.log(`Vectors deleted for document ${documentId}`);
  }

  /**
   * Re-upsert a set of chunks (already persisted in Postgres) into Qdrant.
   * Used by document versioning rollback to restore a past version without
   * re-running the parsing/chunking phases.
   *
   * The dense embedding still has to be recomputed (vectors are not stored
   * in Postgres), but the chunks themselves are taken verbatim from the
   * `Chunk` table — no re-parsing, no re-chunking.
   */
  async reindexChunks(
    aiId: string,
    documentId: string,
    chunks: Array<{ id: string; content: string; position: number; pageNumber: number | null }>,
    source: string
  ): Promise<void> {
    if (chunks.length === 0) {
      this.logger.warn(`reindexChunks called with no chunks for document ${documentId}`);
      return;
    }

    const vectorStore = this.factory.getVectorStore();
    const embeddingService = this.factory.getEmbeddingService();
    const sparseGenerator = this.factory.getSparseGenerator();

    // Drop the currently-indexed points for that document before re-upserting.
    await vectorStore.deleteByDocument(aiId, documentId);

    const BATCH_SIZE = 100;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.content);
      const denseVectors = await embeddingService.embedBatch(texts);
      const sparseVectors = sparseGenerator.generateBatch(texts);

      const points = batch.map((chunk, idx) => {
        const dense = denseVectors[idx];
        const sparse = sparseVectors[idx];
        if (!dense || !sparse) {
          throw new Error(`Missing embedding for chunk ${chunk.id}`);
        }
        return {
          id: chunk.id,
          denseVector: dense,
          sparseVector: sparse,
          payload: {
            ai_id: aiId,
            text: chunk.content,
            source,
            documentId,
            chunkIndex: chunk.position,
            ...(chunk.pageNumber != null ? { pageNumber: chunk.pageNumber } : {}),
          },
        };
      });

      const isLastBatch = i + BATCH_SIZE >= chunks.length;
      await vectorStore.upsert(points, isLastBatch);
    }

    this.logger.log(`Re-upserted ${chunks.length} chunks for document ${documentId}`);

    await this.answerCache.invalidate(aiId);
  }

  /**
   * Supprime tous les vecteurs d'une AI dans la collection globale.
   */
  async deleteAIVectors(aiId: string): Promise<void> {
    this.logger.log(`Deleting all vectors for AI ${aiId}`);

    const vectorStore = this.factory.getVectorStore();

    try {
      await vectorStore.deleteByAI(aiId);
      await this.answerCache.invalidate(aiId);
      this.logger.log(`Vectors deleted for AI ${aiId}`);
    } catch (error) {
      this.logger.warn(`Could not delete vectors for AI ${aiId}: ${error}`);
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

    const threshold = options?.scoreThreshold ?? RAG_QUERY_DEFAULTS.scoreThreshold;
    const topK = options?.topK ?? 5;

    // Embed the question + generate sparse vector
    const embeddingService = this.factory.getEmbeddingService();
    const questionEmbedding = await embeddingService.embed(question);
    const sparseVector = this.factory.getSparseGenerator().generate(question);

    // Hybrid search via global collection
    const vectorStore = this.factory.getVectorStore();
    const results = await vectorStore.hybridSearch(questionEmbedding, sparseVector, aiId, {
      limit: topK,
      scoreThreshold: 0.0, // No filter to see all results in debug
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
      this.logger.log(
        `  #${r.rank} score=${r.score.toFixed(4)} source="${r.source}" excerpt="${r.excerpt.slice(0, 100)}..."`
      );
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
