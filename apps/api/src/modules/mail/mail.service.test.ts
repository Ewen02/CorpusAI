import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MailService } from './mail.service';

const mockSend = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('MailService', () => {
  let service: MailService;

  const mockConfigWithKey = {
    get: vi.fn((key: string) => {
      const env: Record<string, string> = {
        RESEND_API_KEY: 'test-api-key',
        RESEND_FROM_EMAIL: 'noreply@test.io',
        FRONTEND_URL: 'https://app.test.io',
      };
      return env[key];
    }),
  };

  const mockConfigWithoutKey = {
    get: vi.fn((key: string) => {
      const env: Record<string, string> = {
        RESEND_FROM_EMAIL: 'noreply@test.io',
        FRONTEND_URL: 'https://app.test.io',
      };
      return env[key];
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MailService(mockConfigWithKey as any);
  });

  describe('sendMagicLink', () => {
    it('should send email with correct subject when no aiName provided', async () => {
      mockSend.mockResolvedValue({ id: 'email-1' });

      await service.sendMagicLink('user@test.com', 'token-abc');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Votre lien de connexion CorpusAI',
          from: 'noreply@test.io',
        })
      );
    });

    it('should include AI name in subject when provided', async () => {
      mockSend.mockResolvedValue({ id: 'email-2' });

      await service.sendMagicLink('user@test.com', 'token-abc', 'My Assistant');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Votre lien d'acc\u00e8s \u00e0 My Assistant",
        })
      );
    });
  });

  describe('sendInvite', () => {
    it('should send email with creator name and access URL', async () => {
      mockSend.mockResolvedValue({ id: 'email-3' });

      await service.sendInvite(
        'invited@test.com',
        'Sales Bot',
        'Alice',
        'https://app.test.io/chat/sales-bot'
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'invited@test.com',
          subject: 'Alice vous invite \u00e0 acc\u00e9der \u00e0 Sales Bot',
          from: 'noreply@test.io',
        })
      );
      // Verify the HTML contains the access URL and creator name
      const htmlArg = mockSend.mock.calls[0]![0].html as string;
      expect(htmlArg).toContain('Alice');
      expect(htmlArg).toContain('Sales Bot');
      expect(htmlArg).toContain('https://app.test.io/chat/sales-bot');
    });
  });

  describe('sendWelcome', () => {
    it('should send welcome email', async () => {
      mockSend.mockResolvedValue({ id: 'email-4' });

      await service.sendWelcome('new@test.com', 'Bob');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@test.com',
          subject: 'Bienvenue sur CorpusAI',
          from: 'noreply@test.io',
        })
      );
      const htmlArg = mockSend.mock.calls[0]![0].html as string;
      expect(htmlArg).toContain('Bob');
      expect(htmlArg).toContain('https://app.test.io/dashboard');
    });
  });

  describe('send (private, via public methods)', () => {
    it('should log warning and not crash when RESEND_API_KEY is not configured', async () => {
      const serviceNoKey = new MailService(mockConfigWithoutKey as any);

      // Should not throw
      await serviceNoKey.sendWelcome('user@test.com', 'Test');

      // Resend.emails.send should never be called
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
