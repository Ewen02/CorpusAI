import { Inject, Injectable, Logger } from '@nestjs/common';
import { MessageRole } from '@corpusai/database';
import { LLM_SERVICE, type LLMService } from '../../infrastructure/llm';
import { MemoryRepository } from './memory.repository';

@Injectable()
export class EndUserMemoryService {
  private readonly logger = new Logger(EndUserMemoryService.name);

  constructor(
    @Inject(LLM_SERVICE) private readonly llm: LLMService,
    private readonly repo: MemoryRepository
  ) {}

  /**
   * Retrieves the memory summary for an end-user + AI pair.
   */
  async getMemory(endUserId: string, aiId: string): Promise<string | null> {
    return this.repo.findSummary(endUserId, aiId);
  }

  /**
   * Generates/updates a memory summary for an end-user + AI pair
   * by summarizing the conversation with LLM and upserting the result.
   */
  async updateMemory(endUserId: string, aiId: string, conversationId: string): Promise<void> {
    const messages = await this.repo.findConversationMessages(conversationId);

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

      await this.repo.upsertSummary(endUserId, aiId, summary);

      this.logger.log(
        `Memory updated for endUser=${endUserId} ai=${aiId} (${summary.length} chars)`
      );
    } catch (error) {
      this.logger.warn(`Memory summarization failed: ${error}`);
    }
  }
}
