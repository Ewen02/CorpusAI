import { Inject, Injectable, Logger } from '@nestjs/common';
import { prisma, MessageRole } from '@corpusai/database';
import { LLM_SERVICE, type LLMService } from '../../infrastructure/llm';

@Injectable()
export class EndUserMemoryService {
  private readonly logger = new Logger(EndUserMemoryService.name);

  constructor(@Inject(LLM_SERVICE) private readonly llm: LLMService) {}

  /**
   * Retrieves the memory summary for an end-user + AI pair.
   */
  async getMemory(endUserId: string, aiId: string): Promise<string | null> {
    const memory = await prisma.endUserMemory.findUnique({
      where: { endUserId_aiId: { endUserId, aiId } },
      select: { summary: true },
    });
    return memory?.summary ?? null;
  }

  /**
   * Generates/updates a memory summary for an end-user + AI pair
   * by summarizing the conversation with LLM and upserting the result.
   */
  async updateMemory(endUserId: string, aiId: string, conversationId: string): Promise<void> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    if (messages.length < 4) return;

    const existingMemory = await this.getMemory(endUserId, aiId);

    const conversationText = messages
      .map(
        (m) => `${m.role === MessageRole.USER ? 'User' : 'Assistant'}: ${m.content.slice(0, 500)}`
      )
      .join('\n');

    const systemPrompt = existingMemory
      ? `You are a memory summarizer. You have an existing memory summary from previous conversations and a new conversation. Create an updated summary that combines both. Keep only the most important and relevant information. The summary must be concise (max 500 tokens). Write in the same language as the conversation.

EXISTING MEMORY:
${existingMemory}`
      : `You are a memory summarizer. Summarize the key points from this conversation that would be useful context for future conversations with this user. Focus on: user preferences, key topics discussed, important facts shared, and any requests or needs mentioned. The summary must be concise (max 500 tokens). Write in the same language as the conversation.`;

    try {
      const response = await this.llm.chatCompletion({
        temperature: 0.3,
        maxTokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `CONVERSATION:\n${conversationText}` },
        ],
      });

      const summary = response.content?.trim();
      if (!summary) return;

      await prisma.endUserMemory.upsert({
        where: { endUserId_aiId: { endUserId, aiId } },
        create: { endUserId, aiId, summary },
        update: { summary },
      });

      this.logger.log(
        `Memory updated for endUser=${endUserId} ai=${aiId} (${summary.length} chars)`
      );
    } catch (error) {
      this.logger.warn(`Memory summarization failed: ${error}`);
    }
  }
}
