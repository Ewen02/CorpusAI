import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';

@Injectable()
export class MemoryRepository {
  constructor(private readonly db: PrismaService) {}

  async findSummary(endUserId: string, aiId: string): Promise<string | null> {
    const memory = await this.db.client.endUserMemory.findUnique({
      where: { endUserId_aiId: { endUserId, aiId } },
      select: { summary: true },
    });
    return memory?.summary ?? null;
  }

  async findConversationMessages(conversationId: string) {
    return this.db.client.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });
  }

  async upsertSummary(endUserId: string, aiId: string, summary: string): Promise<void> {
    await this.db.client.endUserMemory.upsert({
      where: { endUserId_aiId: { endUserId, aiId } },
      create: { endUserId, aiId, summary },
      update: { summary },
    });
  }
}
