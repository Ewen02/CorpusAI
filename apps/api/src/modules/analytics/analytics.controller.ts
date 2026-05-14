import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { AnalyticsService } from './analytics.service';
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
}
