import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DocumentVersionsService } from './document-versions.service';

describe('DocumentVersionsService', () => {
  const mockOwnership = {
    verifyDocumentOwnership: vi.fn(),
  };

  const mockRepo = {
    findVersions: vi.fn(),
    findVersionById: vi.fn(),
    rollbackToVersion: vi.fn(),
    findChunksByVersion: vi.fn(),
  };

  const mockRag = {
    reindexChunks: vi.fn(),
  };

  let service: DocumentVersionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DocumentVersionsService(
      mockOwnership as never,
      mockRepo as never,
      mockRag as never
    );
    mockOwnership.verifyDocumentOwnership.mockResolvedValue({
      documentId: 'doc-1',
      aiId: 'ai-1',
    });
  });

  describe('listVersions', () => {
    it('returns all versions, newest first, after ownership check', async () => {
      const versions = [
        { id: 'dv-2', version: 2, isActive: true },
        { id: 'dv-1', version: 1, isActive: false },
      ];
      mockRepo.findVersions.mockResolvedValue(versions);

      const result = await service.listVersions('user-1', 'doc-1');

      expect(mockOwnership.verifyDocumentOwnership).toHaveBeenCalledWith('doc-1', 'user-1');
      expect(mockRepo.findVersions).toHaveBeenCalledWith('doc-1');
      expect(result).toBe(versions);
    });

    it('rejects when ownership check fails (NotFoundException bubbles up)', async () => {
      mockOwnership.verifyDocumentOwnership.mockRejectedValue(
        new NotFoundException('Document not found')
      );

      await expect(service.listVersions('user-1', 'doc-1')).rejects.toThrow(NotFoundException);
      expect(mockRepo.findVersions).not.toHaveBeenCalled();
    });
  });

  describe('rollback', () => {
    const buildVersion = (id: string, overrides: Partial<Record<string, unknown>> = {}) => ({
      id,
      documentId: 'doc-1',
      version: 1,
      filename: 'doc.pdf',
      mimeType: 'application/pdf',
      size: 100,
      url: null,
      chunkCount: 5,
      wordCount: 200,
      pageCount: 1,
      status: 'INDEXED',
      uploadedAt: new Date(),
      isActive: false,
      metadata: { title: 'Doc' },
      document: { id: 'doc-1', aiId: 'ai-1', ai: { userId: 'user-1' } },
      ...overrides,
    });

    it('rolls back to a different version, re-upserts chunks and reports changed=true', async () => {
      mockRepo.findVersionById.mockResolvedValue(buildVersion('dv-1'));
      mockRepo.rollbackToVersion.mockResolvedValue({
        target: { id: 'dv-1', version: 1, status: 'INDEXED' },
        previous: { id: 'dv-2', version: 2 },
        changed: true,
      });
      mockRepo.findChunksByVersion.mockResolvedValue([
        { id: 'c1', content: 'hello', position: 0, pageNumber: 1, qdrantPointId: 'c1' },
      ]);

      const result = await service.rollback('user-1', 'doc-1', 'dv-1');

      expect(mockRepo.rollbackToVersion).toHaveBeenCalledWith('doc-1', 'dv-1');
      expect(mockRag.reindexChunks).toHaveBeenCalledWith(
        'ai-1',
        'doc-1',
        [{ id: 'c1', content: 'hello', position: 0, pageNumber: 1 }],
        'doc.pdf'
      );
      expect(result).toEqual({ success: true, changed: true, activeVersion: 1 });
    });

    it('is idempotent: rolling back to the already-active version skips Qdrant', async () => {
      mockRepo.findVersionById.mockResolvedValue(buildVersion('dv-1', { isActive: true }));
      mockRepo.rollbackToVersion.mockResolvedValue({
        target: { id: 'dv-1', version: 1, isActive: true, status: 'INDEXED' },
        previous: null,
        changed: false,
      });

      const result = await service.rollback('user-1', 'doc-1', 'dv-1');

      expect(mockRag.reindexChunks).not.toHaveBeenCalled();
      expect(mockRepo.findChunksByVersion).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, changed: false, activeVersion: 1 });
    });

    it('throws NotFoundException when version does not exist', async () => {
      mockRepo.findVersionById.mockResolvedValue(null);

      await expect(service.rollback('user-1', 'doc-1', 'dv-missing')).rejects.toThrow(
        NotFoundException
      );
      expect(mockRepo.rollbackToVersion).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when version belongs to another document', async () => {
      mockRepo.findVersionById.mockResolvedValue(buildVersion('dv-other', { documentId: 'doc-2' }));

      await expect(service.rollback('user-1', 'doc-1', 'dv-other')).rejects.toThrow(
        NotFoundException
      );
      expect(mockRepo.rollbackToVersion).not.toHaveBeenCalled();
    });

    it('blocks rollback when ownership check fails', async () => {
      mockOwnership.verifyDocumentOwnership.mockRejectedValue(
        new NotFoundException('Document not found')
      );

      await expect(service.rollback('user-1', 'doc-1', 'dv-1')).rejects.toThrow(NotFoundException);
      expect(mockRepo.findVersionById).not.toHaveBeenCalled();
    });

    it('tolerates empty chunk set (worker never finished indexing the version)', async () => {
      mockRepo.findVersionById.mockResolvedValue(buildVersion('dv-1'));
      mockRepo.rollbackToVersion.mockResolvedValue({
        target: { id: 'dv-1', version: 1, status: 'INDEXED' },
        previous: { id: 'dv-2', version: 2 },
        changed: true,
      });
      mockRepo.findChunksByVersion.mockResolvedValue([]);

      const result = await service.rollback('user-1', 'doc-1', 'dv-1');

      expect(mockRag.reindexChunks).not.toHaveBeenCalled();
      expect(result.changed).toBe(true);
    });

    it('reports NotFoundException when repository fails to find the version mid-transaction', async () => {
      mockRepo.findVersionById.mockResolvedValue(buildVersion('dv-1'));
      mockRepo.rollbackToVersion.mockResolvedValue(null);

      await expect(service.rollback('user-1', 'doc-1', 'dv-1')).rejects.toThrow(NotFoundException);
    });

    it('forwards filename from the snapshot when re-upserting chunks', async () => {
      mockRepo.findVersionById.mockResolvedValue(
        buildVersion('dv-1', { filename: 'archive/old.pdf' })
      );
      mockRepo.rollbackToVersion.mockResolvedValue({
        target: { id: 'dv-1', version: 1, status: 'INDEXED' },
        previous: { id: 'dv-2', version: 2 },
        changed: true,
      });
      mockRepo.findChunksByVersion.mockResolvedValue([
        { id: 'c1', content: 'x', position: 0, pageNumber: null, qdrantPointId: 'c1' },
      ]);

      await service.rollback('user-1', 'doc-1', 'dv-1');

      expect(mockRag.reindexChunks).toHaveBeenCalledWith(
        'ai-1',
        'doc-1',
        [{ id: 'c1', content: 'x', position: 0, pageNumber: null }],
        'archive/old.pdf'
      );
    });
  });
});
