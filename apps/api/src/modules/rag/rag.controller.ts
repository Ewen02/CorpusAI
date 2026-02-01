import { Controller, Get, Param, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RagService } from './rag.service';
import { AuthGuard } from '../auth';

/**
 * Controller pour les endpoints RAG globaux.
 * Expose les métriques du système RAG et les outils de debug.
 */
@ApiTags('rag')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  /**
   * Retourne les métriques du système RAG.
   * - cache: métriques du cache d'embeddings (hits, misses, hitRate)
   * - cacheEnabled: indique si le cache Redis est actif
   */
  @Get('metrics')
  getMetrics() {
    return {
      cache: this.ragService.getCacheMetrics(),
      cacheEnabled: this.ragService.isCacheEnabled(),
    };
  }

  /**
   * Debug endpoint pour voir les sources récupérées sans générer de réponse LLM.
   * Permet de diagnostiquer les problèmes de retrieval.
   *
   * @example GET /rag/:aiId/debug-query?q=Comment%20commencer&threshold=0.6
   */
  @Get(':aiId/debug-query')
  async debugQuery(
    @Param('aiId') aiId: string,
    @Query('q') question: string,
    @Query('topK') topK?: string,
    @Query('threshold') threshold?: string
  ) {
    if (!question || question.trim().length === 0) {
      throw new BadRequestException('Query parameter "q" is required');
    }

    return this.ragService.debugQuery(aiId, question, {
      topK: topK ? parseInt(topK, 10) : 5,
      scoreThreshold: threshold ? parseFloat(threshold) : 0.6,
    });
  }
}
