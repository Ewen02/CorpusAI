import { Injectable, NotFoundException } from '@nestjs/common';
import type { EndUser } from '@corpusai/database';
import { PortalRepository } from './portal.repository';

@Injectable()
export class PortalService {
  constructor(private readonly repo: PortalRepository) {}

  async getMe(endUser: EndUser) {
    const grants = await this.repo.findActiveGrants(endUser.id);

    return {
      id: endUser.id,
      email: endUser.email,
      name: endUser.name,
      emailVerified: endUser.emailVerified,
      createdAt: endUser.createdAt,
      ais: grants.map((g) => g.ai),
    };
  }

  async getConversations(endUser: EndUser) {
    return this.repo.findConversations(endUser.id);
  }

  async getConversation(endUser: EndUser, conversationId: string) {
    const conversation = await this.repo.findConversation(endUser.id, conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }
}
