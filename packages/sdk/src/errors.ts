import type { APIErrorBody } from './types';

export class CorpusAIError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, body: APIErrorBody) {
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    super(message);
    this.name = 'CorpusAIError';
    this.status = status;
    this.code = body.error;
  }
}
