import { Controller, Get, Param, Query, BadRequestException, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get RAG cache metrics' })
  @ApiResponse({ status: 200, description: 'RAG cache metrics returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Debug RAG retrieval for an AI without generating an LLM response' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiQuery({ name: 'q', required: true, description: 'Question to retrieve sources for' })
  @ApiQuery({ name: 'topK', required: false, description: 'Number of sources to retrieve' })
  @ApiQuery({
    name: 'threshold',
    required: false,
    description: 'Minimum similarity score threshold',
  })
  @ApiResponse({ status: 200, description: 'Retrieved sources returned' })
  @ApiResponse({ status: 400, description: 'Query parameter "q" is required' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
