import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

vi.mock('@corpusai/database', () => ({
  prisma: {
    aI: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        document: {
          create: vi.fn().mockResolvedValue({ id: 'doc-new', aiId: 'ai-1', filename: 'test.pdf' }),
        },
        aI: { update: vi.fn() },
        dailyStats: { upsert: vi.fn() },
      })
    ),
  },
  DocumentStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    INDEXED: 'INDEXED',
    FAILED: 'FAILED',
  },
}));

vi.mock('@corpusai/subscription', () => ({
  getFeatureLimits: vi.fn().mockReturnValue({
    maxDocumentsPerAI: 20,
    maxDocumentSizeMB: 10,
  }),
  canUploadDocument: vi.fn().mockReturnValue(true),
  canAddDocument: vi.fn().mockReturnValue(true),
}));

vi.mock('@corpusai/types', () => ({
  SUPPORTED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'text/markdown'],
}));

vi.mock('@corpusai/queue', () => ({
  JOB_RETRY_CONFIG: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
}));

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../shared/daily-stats', () => ({
  incrementDailyStats: vi.fn(),
}));

import { prisma } from '@corpusai/database';
import { canAddDocument, canUploadDocument } from '@corpusai/subscription';

const mockAI = prisma.aI as unknown as { findFirst: ReturnType<typeof vi.fn> };
const mockDocument = prisma.document as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('DocumentsService', () => {
  let service: DocumentsService;
  const mockQueue = { add: vi.fn() };
  const mockRagService = { deleteDocumentVectors: vi.fn() };
  const mockOwnershipService = {
    verifyAIOwnership: vi.fn().mockResolvedValue(undefined),
    getOwnedAI: vi.fn(),
    verifyDocumentOwnership: vi.fn(),
    verifyConversationOwnership: vi.fn(),
  };

  beforeEach(() => {
    service = new DocumentsService(
      mockRagService as any,
      mockQueue as any,
      mockOwnershipService as any
    );
    vi.clearAllMocks();
    (canAddDocument as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (canUploadDocument as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  describe('findAllByAI', () => {
    it('should return documents for owned AI', async () => {
      mockAI.findFirst.mockResolvedValue({ id: 'ai-1', userId: 'user-1' });
      const docs = [{ id: 'doc-1', filename: 'test.pdf' }];
      mockDocument.findMany.mockResolvedValue(docs);

      const result = await service.findAllByAI('user-1', 'ai-1');
      expect(result).toBe(docs);
    });

    it('should throw NotFoundException when AI not owned', async () => {
      mockAI.findFirst.mockResolvedValue(null);
      await expect(service.findAllByAI('user-1', 'ai-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return document when owned', async () => {
      const doc = { id: 'doc-1', ai: { userId: 'user-1' } };
      mockDocument.findUnique.mockResolvedValue(doc);

      const result = await service.findOne('user-1', 'doc-1');
      expect(result).toBe(doc);
    });

    it('should throw when document not found', async () => {
      mockDocument.findUnique.mockResolvedValue(null);
      await expect(service.findOne('user-1', 'doc-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw when user does not own document', async () => {
      mockDocument.findUnique.mockResolvedValue({ id: 'doc-1', ai: { userId: 'other' } });
      await expect(service.findOne('user-1', 'doc-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      filename: 'test.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      url: 'https://example.com/test.pdf',
    };

    it('should create document and queue processing', async () => {
      mockAI.findFirst.mockResolvedValue({
        id: 'ai-1',
        userId: 'user-1',
        user: { subscriptionPlan: 'FREE' },
        _count: { documents: 5 },
      });

      const result = await service.create('user-1', 'ai-1', dto);
      expect(result).toBeDefined();
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should throw NotFoundException when AI not found', async () => {
      mockAI.findFirst.mockResolvedValue(null);
      await expect(service.create('user-1', 'ai-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when document limit reached', async () => {
      mockAI.findFirst.mockResolvedValue({
        id: 'ai-1',
        user: { subscriptionPlan: 'FREE' },
        _count: { documents: 20 },
      });
      (canAddDocument as ReturnType<typeof vi.fn>).mockReturnValue(false);

      await expect(service.create('user-1', 'ai-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when file too large', async () => {
      mockAI.findFirst.mockResolvedValue({
        id: 'ai-1',
        user: { subscriptionPlan: 'FREE' },
        _count: { documents: 0 },
      });
      (canUploadDocument as ReturnType<typeof vi.fn>).mockReturnValue(false);

      await expect(service.create('user-1', 'ai-1', { ...dto, size: 100_000_000 })).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw BadRequestException for unsupported mime type', async () => {
      mockAI.findFirst.mockResolvedValue({
        id: 'ai-1',
        user: { subscriptionPlan: 'FREE' },
        _count: { documents: 0 },
      });

      await expect(
        service.create('user-1', 'ai-1', { ...dto, mimeType: 'application/exe' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProgress', () => {
    it('should return progress for owned document', async () => {
      mockDocument.findUnique.mockResolvedValue({
        id: 'doc-1',
        status: 'PROCESSING',
        processingProgress: 50,
        processingStep: 'EMBEDDING',
        processingStartedAt: new Date(),
        processingCompletedAt: null,
        errorMessage: null,
        ai: { userId: 'user-1' },
      });

      const result = await service.getProgress('user-1', 'doc-1');
      expect(result.progress).toBe(50);
      expect(result.step).toBe('EMBEDDING');
    });

    it('should throw when document not found', async () => {
      mockDocument.findUnique.mockResolvedValue(null);
      await expect(service.getProgress('user-1', 'doc-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete document and vectors', async () => {
      mockDocument.findUnique.mockResolvedValue({
        id: 'doc-1',
        ai: { id: 'ai-1', userId: 'user-1' },
      });
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await service.delete('user-1', 'doc-1');
      expect(result).toEqual({ success: true });
      expect(mockRagService.deleteDocumentVectors).toHaveBeenCalledWith('ai-1', 'doc-1');
    });

    it('should throw when not owned', async () => {
      mockDocument.findUnique.mockResolvedValue({
        id: 'doc-1',
        ai: { id: 'ai-1', userId: 'other' },
      });
      await expect(service.delete('user-1', 'doc-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('retryProcessing', () => {
    it('should re-queue failed document', async () => {
      mockDocument.findUnique.mockResolvedValue({
        id: 'doc-1',
        aiId: 'ai-1',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        url: null,
        status: 'FAILED',
        ai: { userId: 'user-1' },
      });
      mockDocument.update.mockResolvedValue({});

      const result = await service.retryProcessing('user-1', 'doc-1');
      expect(result).toEqual({ success: true });
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should throw when document is not FAILED', async () => {
      mockDocument.findUnique.mockResolvedValue({
        id: 'doc-1',
        status: 'INDEXED',
        ai: { userId: 'user-1' },
      });

      await expect(service.retryProcessing('user-1', 'doc-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createFromBulkUpload', () => {
    const makeFile = (name: string, mime: string, size = 1024): Express.Multer.File =>
      ({
        originalname: name,
        mimetype: mime,
        size,
        buffer: Buffer.from('test'),
      }) as Express.Multer.File;

    const aiWithPlan = (docCount: number, plan = 'FREE') => ({
      id: 'ai-1',
      userId: 'user-1',
      user: { subscriptionPlan: plan },
      _count: { documents: docCount },
    });

    it('should create multiple documents and queue all jobs', async () => {
      mockAI.findFirst.mockResolvedValue(aiWithPlan(2));
      let callCount = 0;
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => unknown) =>
          fn({
            document: {
              create: vi.fn().mockImplementation(() => {
                callCount++;
                return { id: `doc-${callCount}`, aiId: 'ai-1', filename: `file${callCount}.pdf` };
              }),
            },
            aI: { update: vi.fn() },
            dailyStats: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          })
      );

      const files = [
        makeFile('a.pdf', 'application/pdf'),
        makeFile('b.pdf', 'application/pdf'),
        makeFile('c.pdf', 'application/pdf'),
      ];

      const result = await service.createFromBulkUpload('user-1', 'ai-1', files);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(expect.objectContaining({ id: 'doc-1' }));
      expect(mockQueue.add).toHaveBeenCalledTimes(3);
    });

    it('should throw when AI not found', async () => {
      mockAI.findFirst.mockResolvedValue(null);
      const files = [makeFile('a.pdf', 'application/pdf')];
      await expect(service.createFromBulkUpload('user-1', 'ai-1', files)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw when adding files would exceed plan limit', async () => {
      mockAI.findFirst.mockResolvedValue(aiWithPlan(48, 'CREATOR'));
      (canAddDocument as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const files = [
        makeFile('a.pdf', 'application/pdf'),
        makeFile('b.pdf', 'application/pdf'),
        makeFile('c.pdf', 'application/pdf'),
      ];

      await expect(service.createFromBulkUpload('user-1', 'ai-1', files)).rejects.toThrow(
        BadRequestException
      );
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should reject batch when one file has unsupported MIME type', async () => {
      mockAI.findFirst.mockResolvedValue(aiWithPlan(0));

      const files = [
        makeFile('good.pdf', 'application/pdf'),
        makeFile('bad.exe', 'application/x-msdownload'),
      ];

      await expect(service.createFromBulkUpload('user-1', 'ai-1', files)).rejects.toThrow(
        BadRequestException
      );
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should reject batch when one file exceeds size limit', async () => {
      mockAI.findFirst.mockResolvedValue(aiWithPlan(0));
      (canUploadDocument as ReturnType<typeof vi.fn>).mockImplementation(
        (_plan: string, sizeMB: number) => sizeMB <= 50
      );

      const files = [
        makeFile('small.pdf', 'application/pdf', 1024),
        makeFile('huge.pdf', 'application/pdf', 200 * 1024 * 1024),
      ];

      await expect(service.createFromBulkUpload('user-1', 'ai-1', files)).rejects.toThrow(
        BadRequestException
      );
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should include per-file error details in rejection', async () => {
      mockAI.findFirst.mockResolvedValue(aiWithPlan(0));

      const files = [
        makeFile('good.pdf', 'application/pdf'),
        makeFile('bad.exe', 'application/x-msdownload'),
      ];

      try {
        await service.createFromBulkUpload('user-1', 'ai-1', files);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as {
          errors: { filename: string; reason: string }[];
        };
        expect(response.errors).toHaveLength(1);
        expect(response.errors[0]!.filename).toBe('bad.exe');
      }
    });
  });
});
