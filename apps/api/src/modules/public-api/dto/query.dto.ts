import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryPublicApiDto {
  @ApiProperty({ description: 'AI slug to query', example: 'my-ai' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  slug!: string;

  @ApiProperty({ description: 'Question to ask the AI', example: 'What is the main topic?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  question!: string;
}
