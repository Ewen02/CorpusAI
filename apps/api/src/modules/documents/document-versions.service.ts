import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { OwnershipService } from '../../shared/ownership.service';
import { RagService } from '../rag';
import { DocumentVersionsRepository } from './document-versions.repository';

/**
 * Versioning operations on top of `Document`. Lists versions, performs
 * rollback (idempotent), and re-upserts past chunks into Qdrant without
 * re-running the parsing/chunking pipeline.
 *
 * Ownership for every operation is delegated to `OwnershipService` so the
 * controller does not need to know about user-vs-document plumbing.
 */
@Injectable()
export class DocumentVersionsService {
  private readonly logger = new Logger(DocumentVersionsService.name);

  constructor(
    private readonly ownership: OwnershipService,
    private readonly repo: DocumentVersionsRepository,
    private readonly ragService: RagService
  ) {}

  /**
   * List every version of `documentId`, newest first. Caller must own the
   * underlying document; otherwise a 404 is raised.
   */
  async listVersions(userId: string, documentId: string) {
    await this.ownership.verifyDocumentOwnership(documentId, userId);
    return this.repo.findVersions(documentId);
  }

  /**
   * Restore a past version by flipping the `isActive` flag and re-upserting
   * its persisted chunks into Qdrant.
   *
   * Idempotent: rolling back to the already-active version is a no-op and
   * returns `{ changed: false }` without touching the vector store.
   */
  async rollback(userId: string, documentId: string, versionId: string) {
    const { aiId } = await this.ownership.verifyDocumentOwnership(documentId, userId);

    // The version must exist and belong to this document.
    const version = await this.repo.findVersionById(versionId);
    if (!version || version.documentId !== documentId) {
      throw new NotFoundException('Version not found');
    }

    const result = await this.repo.rollbackToVersion(documentId, versionId);
    if (!result) {
      throw new NotFoundException('Version not found');
    }

    if (!result.changed) {
      this.logger.log(
        `Rollback for document ${documentId} skipped — version ${result.target.version} already active`
      );
      return {
        success: true,
        changed: false,
        activeVersion: result.target.version,
      };
    }

    // Re-upsert the restored version's chunks into Qdrant (avoids re-parse).
    const chunks = await this.repo.findChunksByVersion(versionId);
    if (chunks.length > 0) {
      await this.ragService.reindexChunks(
        aiId,
        documentId,
        chunks.map((c) => ({
          id: c.id,
          content: c.content,
          position: c.position,
          pageNumber: c.pageNumber,
        })),
        version.filename
      );
    } else {
      this.logger.warn(
        `No chunks persisted for version ${versionId}; Qdrant was cleared only. ` +
          `This is expected only when the version was created and never finished indexing.`
      );
    }

    this.logger.log(
      `Document ${documentId} rolled back to version ${result.target.version}` +
        (result.previous ? ` (was v${result.previous.version})` : '')
    );

    return {
      success: true,
      changed: true,
      activeVersion: result.target.version,
    };
  }
}
