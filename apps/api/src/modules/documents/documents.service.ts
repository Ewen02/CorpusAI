import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { prisma, DocumentStatus } from "@corpusai/database";
import { getFeatureLimits, canUploadDocument, canAddDocument } from "@corpusai/subscription";
import { SUPPORTED_DOCUMENT_TYPES } from "@corpusai/types";
import { CreateDocumentDto } from "./dto/create-document.dto";

@Injectable()
export class DocumentsService {
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

    // TODO: Queue document for processing (embeddings, chunking)

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

    // Delete document and its chunks (cascade)
    await prisma.document.delete({
      where: { id: documentId },
    });

    // Update AI document count
    await prisma.aI.update({
      where: { id: document.ai.id },
      data: { documentCount: { decrement: 1 } },
    });

    // TODO: Delete vectors from Qdrant

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

    // TODO: Re-queue document for processing

    return { success: true };
  }
}
