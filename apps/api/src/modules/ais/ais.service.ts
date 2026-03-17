import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { prisma, AIStatus } from '@corpusai/database';
import { assertCanCreateAI } from '../../shared/subscription-checks';
import { CreateAIDto } from './dto/create-ai.dto';
import { UpdateAIDto } from './dto/update-ai.dto';
import { RagService } from '../rag/rag.service';

export interface PaginationOptions {
  skip?: number;
  take?: number;
}

@Injectable()
export class AIsService {
  private readonly logger = new Logger(AIsService.name);

  constructor(private readonly ragService: RagService) {}

  async findAll(userId: string, options?: PaginationOptions) {
    const { skip = 0, take = 50 } = options ?? {};

    return prisma.aI.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        status: true,
        accessType: true,
        documentCount: true,
        conversationCount: true,
        questionCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(userId: string, aiId: string) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
      include: {
        documents: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            status: true,
            chunkCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            documents: true,
            conversations: true,
          },
        },
      },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    return ai;
  }

  async findBySlug(slug: string) {
    const ai = await prisma.aI.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        welcomeMessage: true,
        primaryColor: true,
        logo: true,
        accessType: true,
        price: true,
        status: true,
      },
    });

    if (!ai || ai.status !== AIStatus.ACTIVE) {
      throw new NotFoundException('AI not found or not active');
    }

    return ai;
  }

  async create(userId: string, dto: CreateAIDto) {
    // Check subscription limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        _count: { select: { ais: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    assertCanCreateAI(user.subscriptionPlan, user._count.ais);

    // Check slug uniqueness
    const existingSlug = await prisma.aI.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSlug) {
      throw new ConflictException('This slug is already taken');
    }

    return prisma.aI.create({
      data: {
        userId,
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        welcomeMessage: dto.welcomeMessage,
        primaryColor: dto.primaryColor || '#3b82f6',
        accessType: dto.accessType,
        price: dto.price,
        maxTokens: dto.maxTokens || 1024,
        temperature: dto.temperature || 0.7,
        isPublic: dto.isPublic ?? false,
        scoreThreshold: dto.scoreThreshold ?? 0.6,
      },
    });
  }

  async update(userId: string, aiId: string, dto: UpdateAIDto) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    return prisma.aI.update({
      where: { id: aiId },
      data: {
        name: dto.name,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        welcomeMessage: dto.welcomeMessage,
        primaryColor: dto.primaryColor,
        accessType: dto.accessType,
        price: dto.price,
        maxTokens: dto.maxTokens,
        temperature: dto.temperature,
        status: dto.status,
        isPublic: dto.isPublic,
        scoreThreshold: dto.scoreThreshold,
      },
    });
  }

  async delete(userId: string, aiId: string) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    // Clean up Qdrant collection before deleting DB records
    try {
      await this.ragService.deleteAICollection(aiId);
    } catch (error) {
      this.logger.warn(`Failed to delete Qdrant collection for AI ${aiId}: ${error}`);
    }

    await prisma.aI.delete({
      where: { id: aiId },
    });

    return { success: true };
  }

  async getStats(userId: string, aiId: string) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
      select: {
        documentCount: true,
        conversationCount: true,
        questionCount: true,
        _count: {
          select: {
            documents: true,
            conversations: true,
          },
        },
      },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    return {
      documents: ai._count.documents,
      conversations: ai._count.conversations,
      questions: ai.questionCount,
    };
  }
}
