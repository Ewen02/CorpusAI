import { IsString, IsUrl, IsArray, ArrayMinSize, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const WEBHOOK_EVENTS = [
  'document.indexed',
  'document.failed',
  'conversation.started',
  'conversation.message.created',
] as const;

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook endpoint URL' })
  @IsUrl({ require_tld: false }) // allow localhost for dev
  url!: string;

  @ApiProperty({ description: 'Events to subscribe to', example: ['document.indexed'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsIn(WEBHOOK_EVENTS, { each: true })
  events!: string[];
}

export { WEBHOOK_EVENTS };
