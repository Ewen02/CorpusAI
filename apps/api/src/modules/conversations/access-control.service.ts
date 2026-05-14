import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConversationsRepository } from './conversations.repository';

/**
 * Internal AI shape required for access-control validation. Carries the secrets
 * (accessToken, accessCode, inviteOnly) that callers must NEVER return to the
 * client; this service is the only consumer of those fields.
 */
export interface AIAccessContext {
  id: string;
  accessToken: string | null;
  accessCode: string | null;
  inviteOnly: boolean;
}

/**
 * AI access-mode enforcement (OPEN / GATED token / GATED code / MEMBER invite).
 *
 * Throws `UnauthorizedException` with one of the documented `reason` codes so
 * the controller / widget can react accordingly:
 * - `access_token` — direct token mismatch
 * - `access_code` — bcrypt-hashed code mismatch
 * - `invite_only` — no active grant for the end-user
 */
@Injectable()
export class AccessControlService {
  constructor(private readonly repo: ConversationsRepository) {}

  async checkAIAccess(
    ai: AIAccessContext,
    accessToken: string | undefined,
    accessCode: string | undefined,
    endUser: { id: string } | null | undefined
  ): Promise<void> {
    if (ai.accessToken && accessToken !== ai.accessToken) {
      throw new UnauthorizedException({ reason: 'access_token' });
    }

    if (ai.accessCode) {
      const valid = !!accessCode && (await bcrypt.compare(accessCode, ai.accessCode));
      if (!valid) {
        throw new UnauthorizedException({ reason: 'access_code' });
      }
    }

    if (ai.inviteOnly) {
      if (!endUser) {
        throw new UnauthorizedException({ reason: 'invite_only' });
      }
      const grant = await this.repo.findAccessGrant(ai.id, endUser.id);
      if (!grant || (grant.expiresAt && grant.expiresAt < new Date())) {
        throw new UnauthorizedException({ reason: 'invite_only' });
      }
    }
  }
}
