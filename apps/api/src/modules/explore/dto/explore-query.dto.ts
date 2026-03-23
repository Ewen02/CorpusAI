import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AICategory } from '@corpusai/database';

export enum ExploreSort {
  NEWEST = 'newest',
  POPULAR = 'popular',
}

export class ExploreQueryDto {
  @ApiPropertyOptional({ description: 'Search by name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AICategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(AICategory)
  category?: AICategory;

  @ApiPropertyOptional({ enum: ExploreSort, default: ExploreSort.POPULAR })
  @IsOptional()
  @IsEnum(ExploreSort)
  sort?: ExploreSort = ExploreSort.POPULAR;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 24, minimum: 1, maximum: 48 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit?: number = 24;
}
