import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const PAGINATION_DEFAULT_TAKE = 50;
export const PAGINATION_MAX_TAKE = 100;

/**
 * Standard offset-based pagination DTO. Use as `@Query() pagination: PaginationDto`
 * on controllers and pass `pagination.skip` / `pagination.take` to services/repositories.
 *
 * Bounds are enforced server-side so a malicious caller cannot request 1M rows.
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Number of items to skip (0-based offset).',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip: number = 0;

  @ApiPropertyOptional({
    description: `Number of items to return (max ${PAGINATION_MAX_TAKE}).`,
    minimum: 1,
    maximum: PAGINATION_MAX_TAKE,
    default: PAGINATION_DEFAULT_TAKE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_TAKE)
  take: number = PAGINATION_DEFAULT_TAKE;
}

/**
 * Page-based pagination DTO. Use when callers think in pages rather than offsets
 * (admin lists, conversation history).
 */
export class PagePaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based).',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: `Items per page (max ${PAGINATION_MAX_TAKE}).`,
    minimum: 1,
    maximum: PAGINATION_MAX_TAKE,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_TAKE)
  limit: number = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  get take(): number {
    return this.limit;
  }
}
