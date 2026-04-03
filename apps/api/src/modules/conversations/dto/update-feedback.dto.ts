import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFeedbackDto {
  @ApiProperty({
    description: 'Feedback on assistant message',
    enum: ['positive', 'negative'],
  })
  @IsString()
  @IsIn(['positive', 'negative'])
  feedback!: 'positive' | 'negative';
}
