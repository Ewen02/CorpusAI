import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { CollaboratorRole } from '@corpusai/database';
import { OwnershipService } from '../../shared/ownership.service';
import { MAIL_SERVICE, type IMailService, type MailLocale } from '../../infrastructure/mail';
import { CollaboratorsRepository } from './collaborators.repository';

const INVITE_TTL_DAYS = 7;

@Injectable()
export class CollaboratorsService {
  private readonly logger = new Logger(CollaboratorsService.name);

  constructor(
    private readonly repo: CollaboratorsRepository,
    private readonly ownership: OwnershipService,
    @Inject(MAIL_SERVICE) private readonly mailService: IMailService
  ) {}

  /** List all collaborators for an AI (owner-only). */
  async list(aiId: string, userId: string) {
    await this.ownership.verifyAIOwnership(aiId, userId);
    return this.repo.findByAi(aiId);
  }

  /**
   * Invite a collaborator by email. Sends a magic accept link (7 days TTL).
   * Owner-only. Throws ConflictException if already invited.
   */
  async invite(
    aiId: string,
    userId: string,
    inviterName: string,
    email: string,
    role: CollaboratorRole,
    frontendUrl: string
  ): Promise<{
    id: string;
    email: string;
    role: CollaboratorRole;
    inviteUrl: string;
  }> {
    await this.ownership.verifyAIOwnership(aiId, userId);

    const ai = await this.repo.findAIForInvite(aiId);
    if (!ai) throw new NotFoundException('AI not found');

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.repo.findByAiAndEmail(aiId, normalizedEmail);
    if (existing) {
      throw new ConflictException('Collaborator already invited for this AI');
    }

    // Look up an existing user. Per spec: do NOT create a User row here —
    // the invitee will sign up (or sign in) before accepting.
    const targetUser = await this.repo.findUserByEmail(normalizedEmail);

    // Prevent inviting yourself
    if (targetUser?.id === userId) {
      throw new BadRequestException('You cannot invite yourself');
    }

    const inviteToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const created = await this.repo.createInvite({
      aiId,
      email: normalizedEmail,
      userId: targetUser?.id ?? null,
      role,
      invitedBy: userId,
      inviteToken,
      expiresAt,
    });

    const acceptUrl = `${frontendUrl}/team-invite/${inviteToken}`;
    const locale = (ai.language === 'en' ? 'en' : 'fr') as MailLocale;

    try {
      await this.mailService.sendCollaboratorInvite(
        normalizedEmail,
        ai.name,
        inviterName,
        acceptUrl,
        locale
      );
    } catch (err) {
      this.logger.warn(
        `Failed to send collaborator invite email to ${normalizedEmail}: ${(err as Error).message}`
      );
    }

    return {
      id: created.id,
      email: created.email,
      role: created.role,
      inviteUrl: acceptUrl,
    };
  }

  /** Update a collaborator's role (owner-only). */
  async updateRole(aiId: string, collaboratorId: string, userId: string, role: CollaboratorRole) {
    await this.ownership.verifyAIOwnership(aiId, userId);

    const collaborator = await this.repo.findById(collaboratorId);
    if (!collaborator || collaborator.aiId !== aiId) {
      throw new NotFoundException('Collaborator not found');
    }

    return this.repo.updateRole(collaboratorId, role);
  }

  /** Revoke a collaborator (owner-only). */
  async revoke(aiId: string, collaboratorId: string, userId: string) {
    await this.ownership.verifyAIOwnership(aiId, userId);

    const collaborator = await this.repo.findById(collaboratorId);
    if (!collaborator || collaborator.aiId !== aiId) {
      throw new NotFoundException('Collaborator not found');
    }

    await this.repo.delete(collaboratorId);
    return { success: true };
  }

  /**
   * Accept a pending invitation. The current user (must be authenticated)
   * becomes the collaborator. Email of the invite is matched against the
   * authenticated user's email — otherwise ForbiddenException.
   */
  async accept(
    token: string,
    currentUserId: string,
    currentUserEmail: string
  ): Promise<{ aiId: string; aiSlug: string; role: CollaboratorRole }> {
    const invite = await this.repo.findByToken(token);
    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    if (invite.acceptedAt) {
      throw new BadRequestException('Invitation already accepted');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Invitation expired');
    }

    if (invite.email.toLowerCase() !== currentUserEmail.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    const updated = await this.repo.acceptInvite(invite.id, currentUserId);

    return {
      aiId: updated.aiId,
      aiSlug: invite.ai.slug,
      role: updated.role,
    };
  }
}
