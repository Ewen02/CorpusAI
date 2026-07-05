import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RunEvalDto {
  @ApiProperty({ description: 'AI slug to evaluate', example: 'my-support-bot' })
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid slug format' })
  slug!: string;

  @ApiProperty({ description: 'Eval dataset filename', example: 'dataset.support.json' })
  @IsString()
  @Matches(/^dataset\.[a-zA-Z0-9_-]+\.json$/, { message: 'Invalid dataset filename' })
  dataset!: string;
}
