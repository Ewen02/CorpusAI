import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DocumentStatus } from '@corpusai/database';
import { assertCanAddDocument, assertCanUploadDocument } from '../../shared/subscription-checks';
import { OwnershipService } from '../../shared/ownership.service';
import { canAddDocument, canUploadDocument } from '@corpusai/subscription';
import { SUPPORTED_DOCUMENT_TYPES, type SupportedDocumentType } from '@corpusai/types';
import { JOB_RETRY_CONFIG, buildDocumentJobId } from '@corpusai/queue';
import { DOCUMENT_QUEUE_PORT, type IDocumentQueue } from '../../infrastructure/queue';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateTextDocumentDto } from './dto/create-text-document.dto';
import { RagService } from '../rag';
import { DocumentsRepository } from './documents.repository';

export interface PaginationOptions {
  skip?: number;
  take?: number;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private ragService: RagService,
    @Inject(DOCUMENT_QUEUE_PORT) private documentQueue: IDocumentQueue,
    private readonly ownership: OwnershipService,
    private readonly repo: DocumentsRepository
  ) {}

  async findAllByAI(userId: string, aiId: string, options?: PaginationOptions) {
    const { skip = 0, take = 50 } = options ?? {};

    const ai = await this.repo.findAIByIdAndUser(aiId, userId);
    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    return this.repo.findAllByAI(aiId, skip, take);
  }

  async findOne(userId: string, documentId: string) {
    const document = await this.repo.findOneWithOwner(documentId);

    if (!document || document.ai.userId !== userId) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async create(userId: string, aiId: string, dto: CreateDocumentDto) {
    const ai = await this.repo.findAIWithPlanAndDocCount(aiId, userId);

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

    const document = await this.repo.createDocumentWithCounter(aiId, userId, {
      filename: dto.filename,
      mimeType: dto.mimeType,
      size: dto.size,
      url: dto.url,
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
      { ...JOB_RETRY_CONFIG, jobId: buildDocumentJobId(document.id) }
    );

    this.logger.log(`Document ${document.id} queued for processing`);
    return document;
  }

  async createFromText(userId: string, aiId: string, dto: CreateTextDocumentDto) {
    const ai = await this.repo.findAIWithPlanAndDocCount(aiId, userId);

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    assertCanAddDocument(ai.user.subscriptionPlan, ai._count.documents);

    const sizeMB = Buffer.byteLength(dto.content, 'utf8') / (1024 * 1024);
    assertCanUploadDocument(ai.user.subscriptionPlan, sizeMB);

    const document = await this.repo.createDocumentWithCounter(aiId, userId, {
      filename: dto.filename,
      mimeType: 'text/plain',
      size: Buffer.byteLength(dto.content, 'utf8'),
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
      { ...JOB_RETRY_CONFIG, jobId: buildDocumentJobId(document.id) }
    );

    this.logger.log(`Text document ${document.id} queued for processing`);
    return document;
  }

  async createFromUpload(userId: string, aiId: string, file: Express.Multer.File) {
    const ai = await this.repo.findAIWithPlanAndDocCount(aiId, userId);

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

    const document = await this.repo.createDocumentWithCounter(aiId, userId, {
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });

    await this.documentQueue.add(
      'process',
      {
        documentId: document.id,
        aiId,
        filename: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer.toString('base64'),
      },
      { ...JOB_RETRY_CONFIG, jobId: buildDocumentJobId(document.id) }
    );

    this.logger.log(`Uploaded document ${document.id} queued for processing`);
    return document;
  }

  async createFromBulkUpload(userId: string, aiId: string, files: Express.Multer.File[]) {
    const ai = await this.repo.findAIWithPlanAndDocCount(aiId, userId);

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    const plan = ai.user.subscriptionPlan;

    const errors: { filename: string; reason: string }[] = [];

    if (!canAddDocument(plan, ai._count.documents + files.length - 1)) {
      throw new BadRequestException(
        `Adding ${files.length} documents would exceed the ${plan} plan limit. ` +
          `Current: ${ai._count.documents}, trying to add: ${files.length}.`
      );
    }

    for (const file of files) {
      const sizeMB = file.size / (1024 * 1024);
      if (!canUploadDocument(plan, sizeMB)) {
        errors.push({
          filename: file.originalname,
          reason: `File exceeds the maximum upload size for the ${plan} plan`,
        });
        continue;
      }

      if (!SUPPORTED_DOCUMENT_TYPES.includes(file.mimetype as SupportedDocumentType)) {
        errors.push({
          filename: file.originalname,
          reason: `Unsupported file type: ${file.mimetype}`,
        });
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Some files failed validation', errors });
    }

    const documents = await this.repo.createBulkDocumentsWithCounter(aiId, userId, files);

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]!;
      const file = files[i]!;
      await this.documentQueue.add(
        'process',
        {
          documentId: doc.id,
          aiId,
          filename: file.originalname,
          mimeType: file.mimetype,
          buffer: file.buffer.toString('base64'),
        },
        { ...JOB_RETRY_CONFIG, jobId: buildDocumentJobId(doc.id) }
      );
    }

    this.logger.log(`Bulk upload: ${documents.length} documents queued for processing`);
    return documents.map((d) => ({ id: d.id, filename: d.filename }));
  }

  async getProgress(userId: string, documentId: string) {
    const document = await this.repo.findProgress(documentId);

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
    const document = await this.repo.findForDelete(documentId);

    if (!document || document.ai.userId !== userId) {
      throw new NotFoundException('Document not found');
    }

    try {
      await this.ragService.deleteDocumentVectors(document.ai.id, documentId);
    } catch (error) {
      this.logger.warn(`Failed to delete vectors for document ${documentId}: ${error}`);
    }

    await this.repo.deleteWithCounterUpdate(documentId, document.ai.id);

    return { success: true };
  }

  async retryProcessing(userId: string, documentId: string) {
    const document = await this.repo.findForRetry(documentId);

    if (!document || document.ai.userId !== userId) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== DocumentStatus.FAILED) {
      throw new BadRequestException('Only failed documents can be retried');
    }

    await this.repo.resetForRetry(documentId);

    await this.documentQueue.add(
      'process',
      {
        documentId: document.id,
        aiId: document.aiId,
        filename: document.filename,
        mimeType: document.mimeType,
        url: document.url ?? undefined,
      },
      { ...JOB_RETRY_CONFIG, jobId: `${buildDocumentJobId(document.id)}:retry:${Date.now()}` }
    );

    this.logger.log(`Document ${documentId} re-queued for processing`);
    return { success: true };
  }

  async getExportData(userId: string, aiId: string) {
    const ai = await this.ownership.getOwnedAI(aiId, userId);
    const documents = await this.repo.findExportData(aiId);
    return { ai, documents };
  }
}
