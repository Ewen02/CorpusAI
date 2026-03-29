import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { prisma } from '@corpusai/database';
import type { Request } from 'express';

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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();

    // Extract API key from Authorization header (Bearer cai_...)
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('API key required. Use: Authorization: Bearer cai_...');
    }

    const key = authHeader.slice(7);
    if (!key.startsWith('cai_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const keyHash = hashKey(key);

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    // Update last used (fire and forget)
    prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
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
