import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';
import { DocumentStatus, type TransactionClient } from '@corpusai/database';
import { incrementDailyStats } from '../../shared/daily-stats';

@Injectable()
export class DocumentsRepository {
  constructor(private readonly db: PrismaService) {}

  async findAIWithPlanAndDocCount(aiId: string, userId: string) {
    return this.db.client.aI.findFirst({
      where: { id: aiId, userId },
      include: {
        user: { select: { subscriptionPlan: true } },
        _count: { select: { documents: true } },
      },
    });
  }

  async findAllByAI(aiId: string, skip: number, take: number) {
    return this.db.client.document.findMany({
      where: { aiId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        status: true,
        chunkCount: true,
        pageCount: true,
        wordCount: true,
        errorMessage: true,
        createdAt: true,
      },
    });
  }

  async findOneWithOwner(documentId: string) {
    return this.db.client.document.findUnique({
      where: { id: documentId },
      include: { ai: { select: { userId: true } } },
    });
  }

  async findAIByIdAndUser(aiId: string, userId: string) {
    return this.db.client.aI.findFirst({
      where: { id: aiId, userId },
    });
  }

  async createDocumentWithCounter(
    aiId: string,
    userId: string,
    data: { filename: string; mimeType: string; size: number; url?: string }
  ) {
    return this.db.client.$transaction(async (tx: TransactionClient) => {
      const doc = await tx.document.create({
        data: {
          aiId,
          filename: data.filename,
          mimeType: data.mimeType,
          size: data.size,
          url: data.url,
          status: DocumentStatus.PENDING,
        },
      });

      await tx.aI.update({
        where: { id: aiId },
        data: { documentCount: { increment: 1 } },
      });

      await incrementDailyStats(tx, userId, aiId, 'documentCount');

      return doc;
    });
  }

  async createBulkDocumentsWithCounter(
    aiId: string,
    userId: string,
    files: Array<{ originalname: string; mimetype: string; size: number }>
  ) {
    return this.db.client.$transaction(async (tx: TransactionClient) => {
      const created = [];
      for (const file of files) {
        const doc = await tx.document.create({
          data: {
            aiId,
            filename: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            status: DocumentStatus.PENDING,
          },
        });
        created.push(doc);
      }

      await tx.aI.update({
        where: { id: aiId },
        data: { documentCount: { increment: files.length } },
      });

      await incrementDailyStats(tx, userId, aiId, 'documentCount', files.length);

      return created;
    });
  }

  async findProgress(documentId: string) {
    return this.db.client.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        status: true,
        processingProgress: true,
        processingStep: true,
        processingStartedAt: true,
        processingCompletedAt: true,
        errorMessage: true,
        ai: { select: { userId: true } },
      },
    });
  }

  async findForDelete(documentId: string) {
    return this.db.client.document.findUnique({
      where: { id: documentId },
      include: { ai: { select: { id: true, userId: true } } },
    });
  }

  async deleteWithCounterUpdate(documentId: string, aiId: string) {
    return this.db.client.$transaction([
      this.db.client.document.delete({ where: { id: documentId } }),
      this.db.client.aI.update({
        where: { id: aiId },
        data: { documentCount: { decrement: 1 } },
      }),
    ]);
  }

  async findForRetry(documentId: string) {
    return this.db.client.document.findUnique({
      where: { id: documentId },
      include: { ai: { select: { userId: true } } },
    });
  }

  async resetForRetry(documentId: string) {
    return this.db.client.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.PENDING,
        errorMessage: null,
        processingProgress: 0,
        processingStep: null,
      },
    });
  }

  async findExportData(aiId: string) {
    return this.db.client.document.findMany({
      where: { aiId, status: 'INDEXED' },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        chunkCount: true,
        pageCount: true,
        wordCount: true,
        language: true,
        title: true,
        author: true,
        createdAt: true,
        chunks: {
          select: { id: true, content: true, position: true, pageNumber: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
