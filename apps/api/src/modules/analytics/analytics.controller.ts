import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { AnalyticsService } from './analytics.service';
import { QualityReportQueryDto } from './dto/quality-report-query.dto';
import { UsageQueryDto } from './dto/usage-query.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('usage')
  @ApiOperation({
    summary: 'Get token and cost usage breakdown',
    description:
      'Returns total tokens (in/out), total USD cost, a per-day breakdown (zero-filled), ' +
      'and a per-model breakdown over the requested window (max 90 days). ' +
      'When `aiId` is provided, the response is scoped to that AI (ownership enforced).',
  })
  @ApiResponse({ status: 200, description: 'Usage breakdown returned' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found (when aiId is supplied)' })
  async getUsage(@CurrentUser() user: CurrentUserData, @Query() query: UsageQueryDto) {
    return this.analyticsService.getUsage(user.id, query);
  }

  @Get('ais/:aiId/quality-report')
  @ApiOperation({
    summary: 'Get the RAG quality report for an AI',
    description:
      'Returns period-wide quality counters (feedback and confidence rates), the most recent ' +
      'failing answers (negative feedback or LOW confidence, max 20) paired with the question ' +
      'that triggered them, and the top recurring low-confidence questions (coverage gaps, max 10). ' +
      'Ownership of the AI is enforced.',
  })
  @ApiParam({ name: 'aiId', description: 'AI identifier (must be owned by the caller)' })
  @ApiResponse({ status: 200, description: 'Quality report returned' })
  @ApiResponse({ status: 400, description: 'Invalid days parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async getQualityReport(
    @CurrentUser() user: CurrentUserData,
    @Param('aiId') aiId: string,
    @Query() query: QualityReportQueryDto
  ) {
    return this.analyticsService.getQualityReport(user.id, aiId, query);
  }
}
