import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DocumentStatus } from '@corpusai/database';
import { assertCanAddDocument, assertCanUploadDocument } from '../../shared/subscription-checks';
import { OwnershipService } from '../../shared/ownership.service';
import {
  canAddDocument,
  canUploadDocument,
  type SubscriptionPlanType,
} from '@corpusai/subscription';
import { SUPPORTED_DOCUMENT_TYPES, type SupportedDocumentType } from '@corpusai/types';
import { JOB_RETRY_CONFIG, buildDocumentJobId } from '@corpusai/queue';
import { DOCUMENT_QUEUE_PORT, type IDocumentQueue } from '../../infrastructure/queue';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateTextDocumentDto } from './dto/create-text-document.dto';
import { RagService } from '../rag';
import { DocumentsRepository } from './documents.repository';
import {
  DocumentVersionsRepository,
  type CreateVersionInput,
} from './document-versions.repository';

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
    private readonly repo: DocumentsRepository,
    private readonly versionsRepo: DocumentVersionsRepository
  ) {}

  /**
   * If a document with the same `(aiId, filename)` already exists and is
   * active, this returns the id of the existing document so the caller can
   * create a new version on top of it. Otherwise returns `null` and the
   * caller will create a fresh `Document`.
   */
  private async resolveExistingDocument(
    aiId: string,
    filename: string
  ): Promise<{ documentId: string } | null> {
    const existing = await this.versionsRepo.findActiveDocumentByFilename(aiId, filename);
    if (existing && existing.versions.length > 0) {
      return { documentId: existing.id };
    }
    return null;
  }

  /**
   * Stamp the document/version pair on a queue job payload so the worker
   * tags every chunk it persists with the right `documentVersionId`.
   */
  private buildJobOptions(documentId: string, suffix?: string) {
    const baseId = buildDocumentJobId(documentId);
    return {
      ...JOB_RETRY_CONFIG,
      jobId: suffix ? `${baseId}__${suffix}__${Date.now()}` : baseId,
    };
  }

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

    const sizeMB = dto.size / (1024 * 1024);
    assertCanUploadDocument(ai.user.subscriptionPlan, sizeMB);

    const isSupported = SUPPORTED_DOCUMENT_TYPES.includes(dto.mimeType as SupportedDocumentType);
    if (!isSupported) {
      throw new BadRequestException(
        `Unsupported file type. Supported types: ${SUPPORTED_DOCUMENT_TYPES.join(', ')}`
      );
    }

    const versionInput: CreateVersionInput = {
      filename: dto.filename,
      mimeType: dto.mimeType,
      size: dto.size,
      url: dto.url,
    };

    const result = await this.upsertDocumentOrVersion(
      ai.user.subscriptionPlan,
      ai._count.documents,
      aiId,
      userId,
      versionInput
    );

    await this.documentQueue.add(
      'process',
      {
        documentId: result.documentId,
        documentVersionId: result.versionId,
        aiId,
        filename: dto.filename,
        mimeType: dto.mimeType,
        url: dto.url,
      },
      this.buildJobOptions(
        result.documentId,
        result.isNewVersion ? `v${result.version}` : undefined
      )
    );

    this.logger.log(
      `Document ${result.documentId} queued for processing (v${result.version}, new=${result.isNewVersion})`
    );
    return result.document;
  }

  /**
   * Either create a fresh `Document` (plus version 1) or stack a new version
   * on top of an existing same-filename document. Encapsulates the quota
   * check so re-uploads do not consume a quota slot.
   */
  private async upsertDocumentOrVersion(
    plan: SubscriptionPlanType,
    currentDocumentCount: number,
    aiId: string,
    userId: string,
    data: CreateVersionInput
  ): Promise<{
    documentId: string;
    versionId: string;
    version: number;
    isNewVersion: boolean;
    document: unknown;
  }> {
    const existing = await this.resolveExistingDocument(aiId, data.filename);

    if (existing) {
      // Re-upload of an existing document: stack a new version on top.
      // Quota is not re-charged because the document already counts.
      const result = await this.versionsRepo.createNewVersion(existing.documentId, data);
      const document = await this.repo.findOneWithOwner(existing.documentId);
      return {
        documentId: existing.documentId,
        versionId: result.versionId,
        version: result.version,
        isNewVersion: true,
        document,
      };
    }

    // Fresh document: enforce plan limit then create document + version 1.
    assertCanAddDocument(plan, currentDocumentCount);
    const created = await this.repo.createDocumentWithCounter(aiId, userId, data);
    return {
      documentId: created.id,
      versionId: created.versionId,
      version: 1,
      isNewVersion: false,
      document: created,
    };
  }

  async createFromText(userId: string, aiId: string, dto: CreateTextDocumentDto) {
    const ai = await this.repo.findAIWithPlanAndDocCount(aiId, userId);

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    const sizeMB = Buffer.byteLength(dto.content, 'utf8') / (1024 * 1024);
    assertCanUploadDocument(ai.user.subscriptionPlan, sizeMB);

    const result = await this.upsertDocumentOrVersion(
      ai.user.subscriptionPlan,
      ai._count.documents,
      aiId,
      userId,
      {
        filename: dto.filename,
        mimeType: 'text/plain',
        size: Buffer.byteLength(dto.content, 'utf8'),
      }
    );

    await this.documentQueue.add(
      'process',
      {
        documentId: result.documentId,
        documentVersionId: result.versionId,
        aiId,
        filename: dto.filename,
        mimeType: 'text/plain',
        content: dto.content,
      },
      this.buildJobOptions(
        result.documentId,
        result.isNewVersion ? `v${result.version}` : undefined
      )
    );

    this.logger.log(
      `Text document ${result.documentId} queued for processing (v${result.version}, new=${result.isNewVersion})`
    );
    return result.document;
  }

  async createFromUpload(userId: string, aiId: string, file: Express.Multer.File) {
    const ai = await this.repo.findAIWithPlanAndDocCount(aiId, userId);

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    const sizeMB = file.size / (1024 * 1024);
    assertCanUploadDocument(ai.user.subscriptionPlan, sizeMB);

    const isSupported = SUPPORTED_DOCUMENT_TYPES.includes(file.mimetype as SupportedDocumentType);
    if (!isSupported) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: ${SUPPORTED_DOCUMENT_TYPES.join(', ')}`
      );
    }

    const result = await this.upsertDocumentOrVersion(
      ai.user.subscriptionPlan,
      ai._count.documents,
      aiId,
      userId,
      {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      }
    );

    await this.documentQueue.add(
      'process',
      {
        documentId: result.documentId,
        documentVersionId: result.versionId,
        aiId,
        filename: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer.toString('base64'),
      },
      this.buildJobOptions(
        result.documentId,
        result.isNewVersion ? `v${result.version}` : undefined
      )
    );

    this.logger.log(
      `Uploaded document ${result.documentId} queued for processing (v${result.version}, new=${result.isNewVersion})`
    );
    return result.document;
  }

  async createFromBulkUpload(userId: string, aiId: string, files: Express.Multer.File[]) {
    const ai = await this.repo.findAIWithPlanAndDocCount(aiId, userId);

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    const plan = ai.user.subscriptionPlan;
    const errors: { filename: string; reason: string }[] = [];

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

    // Quota check: only count *new* documents (re-uploads of existing
    // filenames become new versions and do not consume a slot).
    let newDocsCount = 0;
    const fileResolutions = await Promise.all(
      files.map(async (f) => {
        const existing = await this.resolveExistingDocument(aiId, f.originalname);
        if (!existing) newDocsCount += 1;
        return { file: f, existing };
      })
    );

    if (newDocsCount > 0 && !canAddDocument(plan, ai._count.documents + newDocsCount - 1)) {
      throw new BadRequestException(
        `Adding ${newDocsCount} documents would exceed the ${plan} plan limit. ` +
          `Current: ${ai._count.documents}, trying to add: ${newDocsCount}.`
      );
    }

    const queued: Array<{ id: string; filename: string }> = [];
    for (const { file, existing } of fileResolutions) {
      const result = await this.upsertDocumentOrVersion(plan, ai._count.documents, aiId, userId, {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });

      await this.documentQueue.add(
        'process',
        {
          documentId: result.documentId,
          documentVersionId: result.versionId,
          aiId,
          filename: file.originalname,
          mimeType: file.mimetype,
          buffer: file.buffer.toString('base64'),
        },
        this.buildJobOptions(
          result.documentId,
          result.isNewVersion ? `v${result.version}` : undefined
        )
      );

      queued.push({ id: result.documentId, filename: file.originalname });
      if (existing) {
        this.logger.log(
          `Bulk: re-upload of "${file.originalname}" → v${result.version} on ${result.documentId}`
        );
      }
    }

    this.logger.log(`Bulk upload: ${queued.length} documents/versions queued for processing`);
    return queued;
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

    // Retry the currently-active version so chunks get tagged consistently.
    const activeVersion = await this.versionsRepo.getActiveVersion(documentId);

    await this.documentQueue.add(
      'process',
      {
        documentId: document.id,
        documentVersionId: activeVersion?.id,
        aiId: document.aiId,
        filename: document.filename,
        mimeType: document.mimeType,
        url: document.url ?? undefined,
      },
      { ...JOB_RETRY_CONFIG, jobId: `${buildDocumentJobId(document.id)}__retry__${Date.now()}` }
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
