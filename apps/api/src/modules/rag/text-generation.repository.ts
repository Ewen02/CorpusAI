import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';
import { DocumentStatus } from '@corpusai/database';

@Injectable()
export class TextGenerationRepository {
  constructor(private readonly db: PrismaService) {}

  async findIndexedChunks(aiId: string, take: number) {
    return this.db.client.chunk.findMany({
      where: {
        document: {
          aiId,
          status: DocumentStatus.INDEXED,
        },
      },
      select: { content: true },
      orderBy: { position: 'asc' },
      take,
    });
  }
}
