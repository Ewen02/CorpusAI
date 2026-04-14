import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  magicLinkTemplate,
  inviteTemplate,
  welcomeTemplate,
  documentIndexedTemplate,
  documentFailedTemplate,
  type Locale,
} from '@corpusai/email';
import type { IMailService } from './mail.port';

@Injectable()
export class ResendMailAdapter implements IMailService {
  private readonly logger = new Logger(ResendMailAdapter.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;
  private readonly locale: Locale = 'fr';

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.fromEmail = this.config.get<string>('RESEND_FROM_EMAIL') || 'noreply@corpusai.io';
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY is not set — email sending is disabled');
    }
  }

  async sendMagicLink(email: string, token: string, aiName?: string): Promise<void> {
    const url = `${this.frontendUrl}/portal/auth/verify?token=${token}`;
    const { subject, html } = magicLinkTemplate(url, aiName, this.locale);
    await this.send(email, subject, html);
  }

  async sendInvite(
    email: string,
    aiName: string,
    creatorName: string,
    accessUrl: string
  ): Promise<void> {
    const { subject, html } = inviteTemplate(aiName, creatorName, accessUrl, this.locale);
    await this.send(email, subject, html);
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const dashboardUrl = `${this.frontendUrl}/dashboard`;
    const { subject, html } = welcomeTemplate(name, dashboardUrl, this.locale);
    await this.send(email, subject, html);
  }

  async sendDocumentIndexed(
    email: string,
    documentName: string,
    aiName: string,
    chunkCount: number,
    aiSettingsUrl: string
  ): Promise<void> {
    const { subject, html } = documentIndexedTemplate(
      documentName,
      aiName,
      chunkCount,
      aiSettingsUrl,
      this.locale
    );
    await this.send(email, subject, html);
  }

  async sendDocumentFailed(
    email: string,
    documentName: string,
    aiName: string,
    errorMessage: string,
    retryUrl: string
  ): Promise<void> {
    const { subject, html } = documentFailedTemplate(
      documentName,
      aiName,
      errorMessage,
      retryUrl,
      this.locale
    );
    await this.send(email, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`Email not sent to ${to} (RESEND_API_KEY not configured): ${subject}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<mailto:${this.fromEmail}?subject=unsubscribe>`,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${(error as Error).message}`);
      throw error;
    }
  }
}
