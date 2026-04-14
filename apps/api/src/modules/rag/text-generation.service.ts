import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { LLM_SERVICE, type LLMService } from '../../infrastructure/llm';
import { TextGenerationRepository } from './text-generation.repository';

@Injectable()
export class TextGenerationService {
  constructor(
    @Inject(LLM_SERVICE) private readonly llm: LLMService,
    private readonly repo: TextGenerationRepository
  ) {}

  async generateAISuggestions(params: {
    aiId: string;
    aiName: string;
    language?: string | null;
  }): Promise<{ description: string; systemPrompt: string; welcomeMessage: string }> {
    const chunks = await this.repo.findIndexedChunks(params.aiId, 20);

    if (chunks.length === 0) {
      throw new BadRequestException('No indexed documents found for this AI');
    }

    const contentSample = chunks
      .map((c) => c.content)
      .join('\n\n')
      .slice(0, 8000);

    const lang = params.language === 'en' ? 'English' : 'French';

    const response = await this.llm.chatCompletion({
      temperature: 0.7,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `You are an expert at configuring AI assistants.
Based on the following document content from an assistant named "${params.aiName}", generate in ${lang}:

DOCUMENT CONTENT:
${contentSample}

Return a JSON object with exactly these 3 fields:
{
  "description": "Short description (max 200 chars) of what this assistant does and what topics it covers",
  "systemPrompt": "System instructions (max 300 chars) guiding the AI behavior and scope",
  "welcomeMessage": "Friendly welcome message (max 150 chars) for end users"
}`,
        },
      ],
    });

    const result = JSON.parse(response.content || '{}') as Record<string, string>;

    return {
      description: (result.description ?? '').slice(0, 500),
      systemPrompt: (result.systemPrompt ?? '').slice(0, 4000),
      welcomeMessage: (result.welcomeMessage ?? '').slice(0, 500),
    };
  }
}
