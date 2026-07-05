import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const QUALITY_REPORT_DEFAULT_DAYS = 30;
export const QUALITY_REPORT_MAX_DAYS = 90;

/**
 * Query parameters for `GET /analytics/ais/:aiId/quality-report`.
 *
 * The window always ends "now"; `days` controls how far back it starts.
 */
export class QualityReportQueryDto {
  @ApiPropertyOptional({
    description: `Window size in days, ending now (max ${QUALITY_REPORT_MAX_DAYS}).`,
    minimum: 1,
    maximum: QUALITY_REPORT_MAX_DAYS,
    default: QUALITY_REPORT_DEFAULT_DAYS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(QUALITY_REPORT_MAX_DAYS)
  days: number = QUALITY_REPORT_DEFAULT_DAYS;
}
