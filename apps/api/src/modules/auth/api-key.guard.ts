import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { AuthRepository } from './auth.repository';

export interface ApiKeyRequest extends Request {
  apiKeyUserId: string;
  apiKeyHash: string;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly authRepository: AuthRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('API key required. Use: Authorization: Bearer cai_...');
    }

    const key = authHeader.slice(7);
    if (!key.startsWith('cai_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const keyHash = hashKey(key);

    const apiKey = await this.authRepository.findApiKeyByHash(keyHash);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    this.authRepository
      .touchApiKeyLastUsed(apiKey.id)
      .catch((err: unknown) =>
        this.logger.warn(
          { apiKeyId: apiKey.id, err: String(err) },
          'Failed to update API key lastUsedAt'
        )
      );

    request.apiKeyUserId = apiKey.userId;
    request.apiKeyHash = keyHash;

    return true;
  }
}
