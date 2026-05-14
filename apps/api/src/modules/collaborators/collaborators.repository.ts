import { Injectable } from '@nestjs/common';
import { CollaboratorRole } from '@corpusai/database';
import { PrismaService } from '../../infrastructure/database';

/**
 * Public fields safe to return for collaborator listing — no secrets, no tokens.
 */
const COLLABORATOR_SELECT = {
  id: true,
  aiId: true,
  userId: true,
  email: true,
  role: true,
  invitedBy: true,
  invitedAt: true,
  acceptedAt: true,
  expiresAt: true,
  user: {
    select: { id: true, name: true, email: true, image: true },
  },
  inviter: {
    select: { id: true, name: true, email: true },
  },
} as const;

@Injectable()
export class CollaboratorsRepository {
  constructor(private readonly db: PrismaService) {}

  findById(id: string) {
    return this.db.client.aICollaborator.findUnique({
      where: { id },
      select: { ...COLLABORATOR_SELECT, aiId: true },
    });
  }

  findByAi(aiId: string) {
    return this.db.client.aICollaborator.findMany({
      where: { aiId },
      orderBy: { invitedAt: 'desc' },
      select: COLLABORATOR_SELECT,
    });
  }

  findByAiAndEmail(aiId: string, email: string) {
    return this.db.client.aICollaborator.findFirst({
      where: { aiId, email },
      select: { id: true, acceptedAt: true, role: true, userId: true },
    });
  }

  findByToken(token: string) {
    return this.db.client.aICollaborator.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        aiId: true,
        email: true,
        userId: true,
        acceptedAt: true,
        expiresAt: true,
        ai: { select: { id: true, slug: true, name: true } },
      },
    });
  }

  findUserByEmail(email: string) {
    return this.db.client.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });
  }

  createInvite(input: {
    aiId: string;
    email: string;
    userId: string | null;
    role: CollaboratorRole;
    invitedBy: string;
    inviteToken: string;
    expiresAt: Date;
  }) {
    return this.db.client.aICollaborator.create({
      data: {
        aiId: input.aiId,
        email: input.email,
        userId: input.userId,
        role: input.role,
        invitedBy: input.invitedBy,
        inviteToken: input.inviteToken,
        expiresAt: input.expiresAt,
      },
      select: COLLABORATOR_SELECT,
    });
  }

  updateRole(id: string, role: CollaboratorRole) {
    return this.db.client.aICollaborator.update({
      where: { id },
      data: { role },
      select: COLLABORATOR_SELECT,
    });
  }

  delete(id: string) {
    return this.db.client.aICollaborator.delete({
      where: { id },
      select: { id: true },
    });
  }

  acceptInvite(id: string, userId: string) {
    return this.db.client.aICollaborator.update({
      where: { id },
      data: {
        userId,
        acceptedAt: new Date(),
        inviteToken: null,
      },
      select: { id: true, aiId: true, role: true },
    });
  }

  findAIForInvite(aiId: string) {
    return this.db.client.aI.findUnique({
      where: { id: aiId },
      select: { id: true, slug: true, name: true, language: true },
    });
  }
}
