import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { prisma, DocumentStatus, type TransactionClient } from '@corpusai/database';
import { assertCanAddDocument, assertCanUploadDocument } from '../../shared/subscription-checks';
import { SUPPORTED_DOCUMENT_TYPES, type SupportedDocumentType } from '@corpusai/types';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Queue } from 'bullmq';
import type { DocumentProcessingJobData } from '@corpusai/queue';
import { JOB_RETRY_CONFIG } from '@corpusai/queue';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateTextDocumentDto } from './dto/create-text-document.dto';
import { RagService } from '../rag';
import { incrementDailyStats } from '../../shared/daily-stats';

export interface PaginationOptions {
  skip?: number;
  take?: number;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private ragService: RagService,
    @Inject('DOCUMENT_QUEUE') private documentQueue: Queue<DocumentProcessingJobData>
  ) {}

  async findAllByAI(userId: string, aiId: string, options?: PaginationOptions) {
    const { skip = 0, take = 50 } = options ?? {};

    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    return prisma.document.findMany({
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

  async findOne(userId: string, documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        ai: {
          select: { userId: true },
        },
      },
    });

    if (!document || document.ai.userId !== userId) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async create(userId: string, aiId: string, dto: CreateDocumentDto) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
      include: {
        user: {
          select: { subscriptionPlan: true },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    assertCanAddDocument(ai.user.subscriptionPlan, ai._count.documents);

    const sizeMB = dto.size / (1024 * 1024);
    assertCanUploadDocument(ai.user.subscriptionPlan, sizeMB);

    const isSupported = SUPPORTED_DOCUMENT_TYPES.includes(dto.mimeType as SupportedDocumentType);
    if (!isSupported) {
      throw new BadRequestException(
        `Unsupported file type. Supported types: ${SUPPORTED_DOCUMENT_TYPES.join(', ')}`
      );
    }

    const document = await prisma.$transaction(async (tx: TransactionClient) => {
      const newDocument = await tx.document.create({
        data: {
          aiId,
          filename: dto.filename,
          mimeType: dto.mimeType,
          size: dto.size,
          url: dto.url,
          status: DocumentStatus.PENDING,
        },
      });

      await tx.aI.update({
        where: { id: aiId },
        data: { documentCount: { increment: 1 } },
      });

      await incrementDailyStats(tx, userId, aiId, 'documentCount');

      return newDocument;
    });

    await this.documentQueue.add(
      'process',
      {
        documentId: document.id,
        aiId,
        filename: dto.filename,
        mimeType: dto.mimeType,
        url: dto.url,
      },
      JOB_RETRY_CONFIG
    );

    this.logger.log(`Document ${document.id} queued for processing`);
    return document;
  }

  async createFromText(userId: string, aiId: string, dto: CreateTextDocumentDto) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
      include: {
        user: {
          select: { subscriptionPlan: true },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    assertCanAddDocument(ai.user.subscriptionPlan, ai._count.documents);

    const sizeMB = Buffer.byteLength(dto.content, 'utf8') / (1024 * 1024);
    assertCanUploadDocument(ai.user.subscriptionPlan, sizeMB);

    const document = await prisma.$transaction(async (tx: TransactionClient) => {
      const newDocument = await tx.document.create({
        data: {
          aiId,
          filename: dto.filename,
          mimeType: 'text/plain',
          size: Buffer.byteLength(dto.content, 'utf8'),
          status: DocumentStatus.PENDING,
        },
      });

      await tx.aI.update({
        where: { id: aiId },
        data: { documentCount: { increment: 1 } },
      });

      await incrementDailyStats(tx, userId, aiId, 'documentCount');

      return newDocument;
    });

    await this.documentQueue.add(
      'process',
      {
        documentId: document.id,
        aiId,
        filename: dto.filename,
        mimeType: 'text/plain',
        content: dto.content,
      },
      JOB_RETRY_CONFIG
    );

    this.logger.log(`Text document ${document.id} queued for processing`);
    return document;
  }

  async createFromUpload(userId: string, aiId: string, file: Express.Multer.File) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
      include: {
        user: {
          select: { subscriptionPlan: true },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    assertCanAddDocument(ai.user.subscriptionPlan, ai._count.documents);

    const sizeMB = file.size / (1024 * 1024);
    assertCanUploadDocument(ai.user.subscriptionPlan, sizeMB);

    const isSupported = SUPPORTED_DOCUMENT_TYPES.includes(file.mimetype as SupportedDocumentType);
    if (!isSupported) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: ${SUPPORTED_DOCUMENT_TYPES.join(', ')}`
      );
    }

    const document = await prisma.$transaction(async (tx: TransactionClient) => {
      const newDocument = await tx.document.create({
        data: {
          aiId,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          status: DocumentStatus.PENDING,
        },
      });

      await tx.aI.update({
        where: { id: aiId },
        data: { documentCount: { increment: 1 } },
      });

      await incrementDailyStats(tx, userId, aiId, 'documentCount');

      return newDocument;
    });

    // Write file to temp directory to avoid storing large buffers in Redis
    const tmpDir = path.join(os.tmpdir(), 'corpusai-uploads');
    await fs.mkdir(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, `${document.id}-${file.originalname}`);
    await fs.writeFile(filePath, file.buffer);

    try {
      await this.documentQueue.add(
        'process',
        {
          documentId: document.id,
          aiId,
          filename: file.originalname,
          mimeType: file.mimetype,
          filePath,
        },
        JOB_RETRY_CONFIG
      );
    } catch (error) {
      await fs.unlink(filePath).catch(() => {});
      throw error;
    }

    this.logger.log(`Uploaded document ${document.id} queued for processing`);
    return document;
  }

  async getProgress(userId: string, documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        status: true,
        processingProgress: true,
        processingStep: true,
        processingStartedAt: true,
        processingCompletedAt: true,
        errorMessage: true,
        ai: {
          select: { userId: true },
        },
      },
    });

    if (!document || document.ai.userId !== userId) {
      throw new NotFoundException('Document not found');
    }

    return {
      id: document.id,
      status: document.status,
      progress: document.processingProgress,
      step: document.processingStep,
      startedAt: document.processingStartedAt,
      completedAt: document.processingCompletedAt,
      errorMessage: document.errorMessage,
    };
  }

  async delete(userId: string, documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        ai: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!document || document.ai.userId !== userId) {
      throw new NotFoundException('Document not found');
    }

    try {
      await this.ragService.deleteDocumentVectors(document.ai.id, documentId);
    } catch (error) {
      this.logger.warn(`Failed to delete vectors for document ${documentId}: ${error}`);
    }

    await prisma.$transaction([
      prisma.document.delete({
        where: { id: documentId },
      }),
      prisma.aI.update({
        where: { id: document.ai.id },
        data: { documentCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  }

  async retryProcessing(userId: string, documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        ai: {
          select: { userId: true },
        },
      },
    });

    if (!document || document.ai.userId !== userId) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== DocumentStatus.FAILED) {
      throw new BadRequestException('Only failed documents can be retried');
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.PENDING,
        errorMessage: null,
        processingProgress: 0,
        processingStep: null,
      },
    });

    await this.documentQueue.add(
      'process',
      {
        documentId: document.id,
        aiId: document.aiId,
        filename: document.filename,
        mimeType: document.mimeType,
        url: document.url ?? undefined,
      },
      JOB_RETRY_CONFIG
    );

    this.logger.log(`Document ${documentId} re-queued for processing`);
    return { success: true };
  }
}
