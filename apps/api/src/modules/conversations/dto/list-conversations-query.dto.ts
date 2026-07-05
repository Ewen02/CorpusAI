import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ConversationSource } from '@corpusai/database';

/**
 * Query params for listing an AI's conversations. Validates `source` against
 * the {@link ConversationSource} enum so an invalid value returns 400 instead
 * of a blind cast that would leak through as a 500.
 */
export class ListConversationsQueryDto {
  @ApiPropertyOptional({ enum: ConversationSource, description: 'Filter by conversation source' })
  @IsOptional()
  @IsEnum(ConversationSource)
  source?: ConversationSource;
}
