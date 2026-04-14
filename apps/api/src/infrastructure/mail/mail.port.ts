export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface IMailService {
  sendMagicLink(email: string, token: string, aiName?: string): Promise<void>;
  sendInvite(email: string, aiName: string, creatorName: string, accessUrl: string): Promise<void>;
  sendWelcome(email: string, name: string): Promise<void>;
  sendDocumentIndexed(
    email: string,
    documentName: string,
    aiName: string,
    chunkCount: number,
    aiSettingsUrl: string
  ): Promise<void>;
  sendDocumentFailed(
    email: string,
    documentName: string,
    aiName: string,
    errorMessage: string,
    retryUrl: string
  ): Promise<void>;
}
