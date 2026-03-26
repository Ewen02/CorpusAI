import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

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
    const subject = aiName ? `Votre lien d'accès à ${aiName}` : 'Votre lien de connexion CorpusAI';

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1e293b; margin-bottom: 8px;">Connexion à votre espace</h2>
        <p style="color: #64748b; margin-bottom: 24px;">
          ${aiName ? `Cliquez sur le lien ci-dessous pour accéder à <strong>${aiName}</strong>.` : 'Cliquez sur le lien ci-dessous pour vous connecter.'}
          Ce lien expire dans <strong>15 minutes</strong>.
        </p>
        <a href="${url}" style="display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          Se connecter
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
          Si vous n'avez pas demandé ce lien, ignorez cet email.
        </p>
      </div>
    `;

    await this.send(email, subject, html);
  }

  async sendInvite(
    email: string,
    aiName: string,
    creatorName: string,
    accessUrl: string
  ): Promise<void> {
    const subject = `${creatorName} vous invite à accéder à ${aiName}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1e293b; margin-bottom: 8px;">Vous avez été invité</h2>
        <p style="color: #64748b; margin-bottom: 24px;">
          <strong>${creatorName}</strong> vous invite à accéder à l'assistant IA <strong>${aiName}</strong>.
        </p>
        <a href="${accessUrl}" style="display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          Accéder à ${aiName}
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
          Cet email vous a été envoyé car ${creatorName} a partagé cet assistant avec vous.
        </p>
      </div>
    `;

    await this.send(email, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`Email not sent to ${to} (RESEND_API_KEY not configured): ${subject}`);
      return;
    }

    try {
      await this.resend.emails.send({ from: this.fromEmail, to, subject, html });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${(error as Error).message}`);
      throw error;
    }
  }
}
