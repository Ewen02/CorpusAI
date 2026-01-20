import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OpenAIEmbeddingService,
  QdrantVectorStore,
  RecursiveChunker,
  RAGPipelineImpl,
  type LLMConfig,
} from '@corpusai/corpus';

/**
 * Factory pour créer des pipelines RAG par AI.
 * Chaque AI a sa propre collection Qdrant (isolation des données).
 */
@Injectable()
export class RagPipelineFactory {
  private embeddingService: OpenAIEmbeddingService;
  private chunker: RecursiveChunker;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.embeddingService = new OpenAIEmbeddingService({
      apiKey,
      model: 'text-embedding-3-small',
    });

    this.chunker = new RecursiveChunker({
      chunkSize: 500,
      chunkOverlap: 100,
    });
  }

  /**
   * Crée un pipeline RAG complet pour une AI spécifique.
   */
  createForAI(aiId: string, llmConfig?: Partial<LLMConfig>): RAGPipelineImpl {
    const vectorStore = this.createVectorStoreForAI(aiId);

    return new RAGPipelineImpl(
      this.embeddingService,
      vectorStore,
      this.chunker,
      {
        apiKey: this.configService.get<string>('OPENAI_API_KEY')!,
        model: llmConfig?.model || 'gpt-4o-mini',
        temperature: llmConfig?.temperature ?? 0.2,
        maxTokens: llmConfig?.maxTokens ?? 1000,
        systemPrompt: llmConfig?.systemPrompt,
      }
    );
  }

  /**
   * Crée un vector store pour une AI (pour opérations de cleanup).
   */
  createVectorStoreForAI(aiId: string): QdrantVectorStore {
    const qdrantUrl = this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333';

    return new QdrantVectorStore({
      url: qdrantUrl,
      collectionName: `ai_${aiId}`,
      vectorSize: this.embeddingService.dimensions,
    });
  }

  /**
   * Retourne les dimensions des embeddings.
   */
  get embeddingDimensions(): number {
    return this.embeddingService.dimensions;
  }
}
