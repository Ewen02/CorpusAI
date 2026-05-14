import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Query parameters for `GET /analytics/usage`.
 *
 * - All fields are optional; defaults are applied server-side.
 * - The maximum window between `startDate` and `endDate` is clamped to 90 days
 *   in the service layer to keep the daily breakdown bounded.
 */
export class UsageQueryDto {
  @ApiPropertyOptional({
    description: 'Restrict the breakdown to a single AI. Ownership is verified.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  aiId?: string;

  @ApiPropertyOptional({
    description: 'Start of the period (ISO-8601). Defaults to 30 days ago.',
    example: '2026-04-14T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End of the period (ISO-8601, exclusive). Defaults to now.',
    example: '2026-05-14T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
