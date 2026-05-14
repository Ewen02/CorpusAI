import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { createHmac, timingSafeEqual } from 'crypto';
import { Sentry } from '../../lib/sentry';

/**
 * Resend webhook events we care about. Reference:
 * https://resend.com/docs/dashboard/webhooks/event-types
 */
type ResendEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.bounced'
  | 'email.complained'
  | 'email.opened'
  | 'email.clicked';

interface ResendEvent {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id?: string;
    to?: string | string[];
    from?: string;
    subject?: string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
}

@ApiTags('webhooks')
@Controller('webhooks/resend')
@SkipThrottle()
export class ResendWebhookController {
  private readonly logger = new Logger(ResendWebhookController.name);
  private readonly signingSecret: string | undefined;

  constructor(config: ConfigService) {
    this.signingSecret = config.get<string>('RESEND_WEBHOOK_SECRET');
    if (!this.signingSecret) {
      this.logger.warn(
        'RESEND_WEBHOOK_SECRET is not set — Resend webhook signature verification is disabled'
      );
    }
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Resend delivery events (bounces, complaints, opens, clicks)' })
  handle(
    @Headers('svix-signature') signature: string | undefined,
    @Headers('svix-id') id: string | undefined,
    @Headers('svix-timestamp') timestamp: string | undefined,
    @Body() event: ResendEvent
  ): { received: true } {
    if (this.signingSecret) {
      this.verifySignature({ id, timestamp, signature, payload: event });
    }

    switch (event.type) {
      case 'email.bounced':
        this.logger.warn(
          { to: event.data.to, bounce: event.data.bounce, emailId: event.data.email_id },
          'Resend bounce'
        );
        Sentry.captureMessage('Resend email bounced', {
          level: 'warning',
          extra: { ...event.data },
        });
        break;
      case 'email.complained':
        this.logger.warn({ to: event.data.to, emailId: event.data.email_id }, 'Resend complaint');
        Sentry.captureMessage('Resend spam complaint', {
          level: 'warning',
          extra: { ...event.data },
        });
        break;
      case 'email.delivery_delayed':
        this.logger.warn(
          { to: event.data.to, emailId: event.data.email_id },
          'Resend delivery delayed'
        );
        break;
      default:
        this.logger.debug({ type: event.type, emailId: event.data.email_id }, 'Resend event');
    }

    return { received: true };
  }

  /**
   * Verify Svix signature (Resend uses Svix for webhook delivery).
   * Header format: `v1,<base64-sig>` (whitespace-separated for multiple sigs).
   */
  private verifySignature(args: {
    id: string | undefined;
    timestamp: string | undefined;
    signature: string | undefined;
    payload: unknown;
  }): void {
    if (!this.signingSecret) return;
    if (!args.id || !args.timestamp || !args.signature) {
      throw new UnauthorizedException('Missing Svix signature headers');
    }

    const secretPart = this.signingSecret.startsWith('whsec_')
      ? this.signingSecret.slice(6)
      : this.signingSecret;
    let secretKey: Buffer;
    try {
      secretKey = Buffer.from(secretPart, 'base64');
    } catch {
      throw new BadRequestException('Invalid RESEND_WEBHOOK_SECRET format');
    }

    const signedContent = `${args.id}.${args.timestamp}.${JSON.stringify(args.payload)}`;
    const expected = createHmac('sha256', secretKey).update(signedContent).digest('base64');
    const expectedBytes = Buffer.from(expected, 'base64');

    const candidates = args.signature.split(' ');
    const matches = candidates.some((candidate) => {
      const [, sig] = candidate.split(',');
      if (!sig) return false;
      try {
        const sigBytes = Buffer.from(sig, 'base64');
        if (sigBytes.length !== expectedBytes.length) return false;
        return timingSafeEqual(sigBytes, expectedBytes);
      } catch {
        return false;
      }
    });

    if (!matches) {
      throw new UnauthorizedException('Invalid Svix signature');
    }
  }
}
