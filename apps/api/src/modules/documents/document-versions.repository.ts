import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';
import { DocumentStatus, type TransactionClient } from '@corpusai/database';

/** Version fields exposed to the dashboard. */
export const DOCUMENT_VERSION_SELECT = {
  id: true,
  documentId: true,
  version: true,
  filename: true,
  mimeType: true,
  size: true,
  url: true,
  chunkCount: true,
  wordCount: true,
  pageCount: true,
  status: true,
  uploadedAt: true,
  isActive: true,
  metadata: true,
} as const;

export type CreateVersionInput = {
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
};

@Injectable()
export class DocumentVersionsRepository {
  constructor(private readonly db: PrismaService) {}

  /**
   * Detect an existing document for the same AI+filename couple. Returns the
   * most recent matching document along with its currently-active version.
   */
  async findActiveDocumentByFilename(aiId: string, filename: string) {
    return this.db.client.document.findFirst({
      where: { aiId, filename },
      select: {
        id: true,
        aiId: true,
        versions: {
          where: { isActive: true },
          select: { id: true, version: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new version on top of an existing document, marking the
   * previously-active version as inactive and resetting the document to
   * PENDING so the worker re-indexes it. Returns the new active version.
   */
  async createNewVersion(
    documentId: string,
    data: CreateVersionInput
  ): Promise<{ documentId: string; versionId: string; version: number }> {
    return this.db.client.$transaction(async (tx: TransactionClient) => {
      const latest = await tx.documentVersion.findFirst({
        where: { documentId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      await tx.documentVersion.updateMany({
        where: { documentId, isActive: true },
        data: { isActive: false },
      });

      const created = await tx.documentVersion.create({
        data: {
          documentId,
          version: nextVersion,
          filename: data.filename,
          mimeType: data.mimeType,
          size: data.size,
          url: data.url,
          status: DocumentStatus.PENDING,
          isActive: true,
        },
        select: { id: true, version: true, documentId: true },
      });

      // Reset the document root row to PENDING so the worker re-indexes it.
      await tx.document.update({
        where: { id: documentId },
        data: {
          filename: data.filename,
          mimeType: data.mimeType,
          size: data.size,
          url: data.url,
          status: DocumentStatus.PENDING,
          chunkCount: 0,
          errorMessage: null,
          processingProgress: 0,
          processingStep: null,
          processingStartedAt: null,
          processingCompletedAt: null,
        },
      });

      return {
        documentId: created.documentId,
        versionId: created.id,
        version: created.version,
      };
    });
  }

  async findVersions(documentId: string) {
    return this.db.client.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: DOCUMENT_VERSION_SELECT,
    });
  }

  async getActiveVersion(documentId: string) {
    return this.db.client.documentVersion.findFirst({
      where: { documentId, isActive: true },
      select: DOCUMENT_VERSION_SELECT,
    });
  }

  async findVersionById(versionId: string) {
    return this.db.client.documentVersion.findUnique({
      where: { id: versionId },
      select: {
        ...DOCUMENT_VERSION_SELECT,
        document: {
          select: {
            id: true,
            aiId: true,
            ai: { select: { userId: true } },
          },
        },
      },
    });
  }

  /**
   * Flip the active flag from the current version to `versionId`. Idempotent:
   * if `versionId` is already active, no rows are mutated and `changed` is false.
   * Returns the new active version + the previously active one (when distinct).
   */
  async rollbackToVersion(documentId: string, versionId: string) {
    return this.db.client.$transaction(async (tx: TransactionClient) => {
      const target = await tx.documentVersion.findFirst({
        where: { id: versionId, documentId },
        select: { id: true, isActive: true, version: true, status: true },
      });
      if (!target) return null;

      if (target.isActive) {
        return { target, previous: null, changed: false };
      }

      const previous = await tx.documentVersion.findFirst({
        where: { documentId, isActive: true, NOT: { id: versionId } },
        select: { id: true, version: true },
      });

      await tx.documentVersion.updateMany({
        where: { documentId, isActive: true },
        data: { isActive: false },
      });

      const updated = await tx.documentVersion.update({
        where: { id: versionId },
        data: { isActive: true },
        select: { id: true, version: true, status: true },
      });

      const snapshot = await tx.documentVersion.findUnique({
        where: { id: versionId },
        select: {
          filename: true,
          mimeType: true,
          size: true,
          url: true,
          status: true,
          chunkCount: true,
          wordCount: true,
          pageCount: true,
          metadata: true,
        },
      });

      if (snapshot) {
        const meta = (snapshot.metadata ?? {}) as Record<string, unknown>;
        await tx.document.update({
          where: { id: documentId },
          data: {
            filename: snapshot.filename,
            mimeType: snapshot.mimeType,
            size: snapshot.size,
            url: snapshot.url,
            status: snapshot.status,
            chunkCount: snapshot.chunkCount,
            wordCount: snapshot.wordCount,
            pageCount: snapshot.pageCount,
            title: typeof meta.title === 'string' ? meta.title : null,
            author: typeof meta.author === 'string' ? meta.author : null,
            language: typeof meta.language === 'string' ? meta.language : null,
          },
        });
      }

      return { target: updated, previous, changed: true };
    });
  }

  /**
   * Fetch chunks of a version, used to re-upsert them to Qdrant on rollback.
   */
  async findChunksByVersion(versionId: string) {
    return this.db.client.chunk.findMany({
      where: { documentVersionId: versionId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        content: true,
        position: true,
        pageNumber: true,
        qdrantPointId: true,
      },
    });
  }
}
