import { Injectable, Logger } from '@nestjs/common';
import { RagPipelineFactory } from './rag-pipeline.factory';
import type { LLMConfig, RAGResponse, IndexResult } from '@corpusai/corpus';

export interface DocumentToIndex {
  id: string;
  content: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface QueryOptions {
  topK?: number;
  scoreThreshold?: number;
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
   */
  async indexDocument(aiId: string, document: DocumentToIndex): Promise<IndexResult> {
    this.logger.log(`Indexing document ${document.id} for AI ${aiId}`);

    const pipeline = this.factory.createForAI(aiId);

    const result = await pipeline.index([
      {
        id: document.id,
        content: document.content,
        source: document.source,
        metadata: document.metadata,
      },
    ]);

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
      topK: options?.topK ?? 5,
      scoreThreshold: options?.scoreThreshold ?? 0.4,
      includeSources: true,
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
      topK: options?.topK ?? 5,
      scoreThreshold: options?.scoreThreshold ?? 0.4,
      includeSources: true,
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
}
