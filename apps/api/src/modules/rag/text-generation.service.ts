import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { prisma, DocumentStatus } from '@corpusai/database';

@Injectable()
export class TextGenerationService {
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('LLM_API_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY') ||
      '';
    const baseURL = this.configService.get<string>('LLM_BASE_URL');
    this.model = this.configService.get<string>('LLM_MODEL') || 'gpt-4o-mini';
    this.openai = new OpenAI({ apiKey, ...(baseURL && { baseURL }) });
  }

  async generateAISuggestions(params: {
    aiId: string;
    aiName: string;
    language?: string | null;
  }): Promise<{ description: string; systemPrompt: string; welcomeMessage: string }> {
    const chunks = await prisma.chunk.findMany({
      where: {
        document: {
          aiId: params.aiId,
          status: DocumentStatus.INDEXED,
        },
      },
      select: { content: true },
      orderBy: { position: 'asc' },
      take: 20,
    });

    if (chunks.length === 0) {
      throw new BadRequestException('No indexed documents found for this AI');
    }

    const contentSample = chunks
      .map((c) => c.content)
      .join('\n\n')
      .slice(0, 8000);

    const lang = params.language === 'en' ? 'English' : 'French';

    const response = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
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

    const result = JSON.parse(response.choices[0]?.message.content ?? '{}') as Record<
      string,
      string
    >;

    return {
      description: (result.description ?? '').slice(0, 500),
      systemPrompt: (result.systemPrompt ?? '').slice(0, 4000),
      welcomeMessage: (result.welcomeMessage ?? '').slice(0, 500),
    };
  }
}
