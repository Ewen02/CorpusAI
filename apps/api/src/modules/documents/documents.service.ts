import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { prisma, DocumentStatus } from "@corpusai/database";
import { getFeatureLimits, canUploadDocument, canAddDocument } from "@corpusai/subscription";
import { SUPPORTED_DOCUMENT_TYPES } from "@corpusai/types";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { CreateTextDocumentDto } from "./dto/create-text-document.dto";
import { RagService } from "../rag";

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private ragService: RagService) {}
  async findAllByAI(userId: string, aiId: string) {
    // Verify ownership
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
    });

    if (!ai) {
      throw new NotFoundException("AI not found");
    }

    return prisma.document.findMany({
      where: { aiId },
      orderBy: { createdAt: "desc" },
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
      throw new NotFoundException("Document not found");
    }

    return document;
  }

  async create(userId: string, aiId: string, dto: CreateDocumentDto) {
    // Verify AI ownership
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
      throw new NotFoundException("AI not found");
    }

    // Check subscription limits
    const limits = getFeatureLimits(ai.user.subscriptionPlan);

    if (!canAddDocument(ai.user.subscriptionPlan, ai._count.documents)) {
      throw new ForbiddenException(
        `You have reached the maximum number of documents (${limits.maxDocumentsPerAI}) per AI for your plan`
      );
    }

    const sizeMB = dto.size / (1024 * 1024);
    if (!canUploadDocument(ai.user.subscriptionPlan, sizeMB)) {
      throw new ForbiddenException(
        `File size exceeds the limit (${limits.maxDocumentSizeMB}MB) for your plan`
      );
    }

    // Validate MIME type
    const isSupported = SUPPORTED_DOCUMENT_TYPES.includes(dto.mimeType as any);

    if (!isSupported) {
      throw new BadRequestException(
        `Unsupported file type. Supported types: ${SUPPORTED_DOCUMENT_TYPES.join(", ")}`
      );
    }

    // Create document
    const document = await prisma.document.create({
      data: {
        aiId,
        filename: dto.filename,
        mimeType: dto.mimeType,
        size: dto.size,
        url: dto.url,
        status: DocumentStatus.PENDING,
      },
    });

    // Update AI document count
    await prisma.aI.update({
      where: { id: aiId },
      data: { documentCount: { increment: 1 } },
    });

    // Process document: chunking + embeddings + vector store
    this.processDocument(document.id, aiId, dto.filename, dto.url ?? null).catch(
      (error: Error) => {
        this.logger.error(`Failed to process document ${document.id}: ${error.message}`);
      }
    );

    return document;
  }

  async updateStatus(
    documentId: string,
    status: DocumentStatus,
    metadata?: {
      chunkCount?: number;
      pageCount?: number;
      wordCount?: number;
      language?: string;
      title?: string;
      author?: string;
      errorMessage?: string;
    }
  ) {
    return prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        ...metadata,
      },
    });
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
      throw new NotFoundException("Document not found");
    }

    // Delete vectors from Qdrant first
    try {
      await this.ragService.deleteDocumentVectors(document.ai.id, documentId);
    } catch (error) {
      this.logger.warn(`Failed to delete vectors for document ${documentId}: ${error}`);
    }

    // Delete document and its chunks (cascade)
    await prisma.document.delete({
      where: { id: documentId },
    });

    // Update AI document count
    await prisma.aI.update({
      where: { id: document.ai.id },
      data: { documentCount: { decrement: 1 } },
    });

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
      throw new NotFoundException("Document not found");
    }

    if (document.status !== DocumentStatus.FAILED) {
      throw new BadRequestException("Only failed documents can be retried");
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.PENDING,
        errorMessage: null,
      },
    });

    // Re-process document
    this.processDocument(document.id, document.aiId, document.filename, document.url).catch(
      (error: Error) => {
        this.logger.error(`Failed to retry document ${documentId}: ${error.message}`);
      }
    );

    return { success: true };
  }

  /**
   * Create a document from direct text content (no URL needed).
   */
  async createFromText(userId: string, aiId: string, dto: CreateTextDocumentDto) {
    // Verify AI ownership
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
      throw new NotFoundException("AI not found");
    }

    // Check subscription limits
    const limits = getFeatureLimits(ai.user.subscriptionPlan);

    if (!canAddDocument(ai.user.subscriptionPlan, ai._count.documents)) {
      throw new ForbiddenException(
        `You have reached the maximum number of documents (${limits.maxDocumentsPerAI}) per AI for your plan`
      );
    }

    const sizeMB = Buffer.byteLength(dto.content, "utf8") / (1024 * 1024);
    if (!canUploadDocument(ai.user.subscriptionPlan, sizeMB)) {
      throw new ForbiddenException(
        `Content size exceeds the limit (${limits.maxDocumentSizeMB}MB) for your plan`
      );
    }

    // Create document
    const document = await prisma.document.create({
      data: {
        aiId,
        filename: dto.filename,
        mimeType: "text/plain",
        size: Buffer.byteLength(dto.content, "utf8"),
        status: DocumentStatus.PENDING,
      },
    });

    // Update AI document count
    await prisma.aI.update({
      where: { id: aiId },
      data: { documentCount: { increment: 1 } },
    });

    // Process document with direct content
    this.processDocumentWithContent(document.id, aiId, dto.filename, dto.content).catch(
      (error: Error) => {
        this.logger.error(`Failed to process text document ${document.id}: ${error.message}`);
      }
    );

    return document;
  }

  /**
   * Process document: fetch content, chunk, embed, store in Qdrant.
   */
  private async processDocument(
    documentId: string,
    aiId: string,
    filename: string,
    url: string | null
  ): Promise<void> {
    this.logger.log(`Processing document ${documentId}`);

    // Update status to PROCESSING
    await this.updateStatus(documentId, DocumentStatus.PROCESSING);

    try {
      // Fetch document content
      const content = await this.fetchDocumentContent(url);

      if (!content || content.trim().length === 0) {
        throw new Error("Document content is empty");
      }

      // Index via RAG service
      const result = await this.ragService.indexDocument(aiId, {
        id: documentId,
        content,
        source: filename,
        metadata: { documentId, aiId },
      });

      // Count words
      const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

      // Update status to INDEXED
      await this.updateStatus(documentId, DocumentStatus.INDEXED, {
        chunkCount: result.chunksCreated,
        wordCount,
      });

      this.logger.log(
        `Document ${documentId} indexed: ${result.chunksCreated} chunks, ${wordCount} words`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to process document ${documentId}: ${errorMessage}`);

      await this.updateStatus(documentId, DocumentStatus.FAILED, {
        errorMessage,
      });
    }
  }

  /**
   * Fetch document content from URL.
   * For MVP: supports text files. Extend for PDF, DOCX, etc.
   */
  private async fetchDocumentContent(url: string | null): Promise<string> {
    if (!url) {
      throw new Error("Document URL is required for processing");
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Process document with direct content (no URL fetch needed).
   */
  private async processDocumentWithContent(
    documentId: string,
    aiId: string,
    filename: string,
    content: string
  ): Promise<void> {
    this.logger.log(`Processing text document ${documentId}`);

    // Update status to PROCESSING
    await this.updateStatus(documentId, DocumentStatus.PROCESSING);

    try {
      if (!content || content.trim().length === 0) {
        throw new Error("Document content is empty");
      }

      // Index via RAG service
      const result = await this.ragService.indexDocument(aiId, {
        id: documentId,
        content,
        source: filename,
        metadata: { documentId, aiId },
      });

      // Count words
      const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

      // Update status to INDEXED
      await this.updateStatus(documentId, DocumentStatus.INDEXED, {
        chunkCount: result.chunksCreated,
        wordCount,
      });

      this.logger.log(
        `Text document ${documentId} indexed: ${result.chunksCreated} chunks, ${wordCount} words`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to process text document ${documentId}: ${errorMessage}`);

      await this.updateStatus(documentId, DocumentStatus.FAILED, {
        errorMessage,
      });
    }
  }
}
