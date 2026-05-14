import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WEBHOOK_EVENTS } from './create-webhook.dto';

/**
 * Sample payloads emitted by the API for each supported event type.
 * Used by the debugger to let the user simulate a real event.
 */
export const TESTABLE_WEBHOOK_EVENTS = [
  'document.indexed',
  'document.failed',
  'conversation.started',
] as const;

export type TestableWebhookEvent = (typeof TESTABLE_WEBHOOK_EVENTS)[number];

export class TestWebhookDto {
  @ApiProperty({
    description: 'Event type to simulate (defaults to "ping").',
    enum: WEBHOOK_EVENTS,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn([...WEBHOOK_EVENTS, 'ping'] as const)
  eventType?: string;
}
