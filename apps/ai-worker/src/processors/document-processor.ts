import { prisma, DocumentStatus, ProcessingStep } from "@corpusai/database";
import { DocumentParserService, type ProcessingStage } from "@corpusai/corpus";
import type { DocumentProcessingJobData } from "@corpusai/queue";
import { getProgressService } from "../services/progress.service";
import { createPipelineForAI } from "../services/rag-factory";

const parserService = new DocumentParserService();

function mapStageToStep(stage: ProcessingStage): ProcessingStep {
  switch (stage) {
    case "chunking": return ProcessingStep.CHUNKING;
    case "embedding": return ProcessingStep.EMBEDDING;
    case "storing": return ProcessingStep.STORING;
    default: return ProcessingStep.CHUNKING;
  }
}

async function publishProgress(
  documentId: string,
  status: DocumentStatus,
  progress: number,
  step: ProcessingStep | null,
  errorMessage?: string,
): Promise<void> {
  const progressService = getProgressService();

  // Update database
  await prisma.document.update({
    where: { id: documentId },
    data: {
      status,
      processingProgress: Math.min(100, Math.max(0, progress)),
      processingStep: step,
      ...(status === DocumentStatus.INDEXED || status === DocumentStatus.FAILED
        ? { processingCompletedAt: new Date() }
        : {}),
      ...(status === DocumentStatus.INDEXED ? { processingStep: null } : {}),
      ...(errorMessage ? { errorMessage } : {}),
    },
  });

  // Publish to Redis for SSE
  await progressService.publish({
    documentId,
    status: status as any,
    progress: Math.min(100, Math.max(0, progress)),
    step: step as any,
    errorMessage,
  });
}

export async function processDocument(data: DocumentProcessingJobData): Promise<void> {
  const { documentId, aiId, filename, mimeType, url, content, buffer } = data;

  // Mark as processing
  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: DocumentStatus.PROCESSING,
      processingStartedAt: new Date(),
      processingProgress: 0,
      processingStep: ProcessingStep.PARSING,
    },
  });

  try {
    await publishProgress(documentId, DocumentStatus.PROCESSING, 2, ProcessingStep.PARSING);

    let parsedContent: string;
    let metadata: {
      wordCount?: number;
      pageCount?: number;
      title?: string;
      author?: string;
      language?: string;
    } = {};

    if (content) {
      // Direct text content — no parsing needed
      parsedContent = content;
    } else {
      // Parse from buffer or URL
      const source = buffer
        ? Buffer.from(buffer, "base64")
        : url;

      if (!source) {
        throw new Error("No content, buffer, or URL provided");
      }

      const parsed = await parserService.parse({
        source,
        filename,
        mimeType,
      });

      parsedContent = parsed.content;
      metadata = {
        wordCount: parsed.wordCount,
        pageCount: parsed.pageCount,
        title: parsed.metadata.title,
        author: parsed.metadata.author,
        language: parsed.metadata.language,
      };
    }

    if (!parsedContent || parsedContent.trim().length === 0) {
      throw new Error("Document content is empty");
    }

    await publishProgress(documentId, DocumentStatus.PROCESSING, 10, ProcessingStep.PARSING);

    // Index via RAG pipeline
    const pipeline = createPipelineForAI(aiId);

    const result = await pipeline.index(
      [
        {
          id: documentId,
          content: parsedContent,
          source: filename,
          metadata: { documentId, aiId, ...metadata },
        },
      ],
      {
        onProgress: async (stage, ragProgress, _details) => {
          const overallProgress = 10 + Math.round(ragProgress * 0.9);
          const step = mapStageToStep(stage);
          await publishProgress(documentId, DocumentStatus.PROCESSING, overallProgress, step);
        },
      },
    );

    // Calculate word count if not from parser
    const wordCount = metadata.wordCount ?? parsedContent.split(/\s+/).filter((w) => w.length > 0).length;

    // Mark as indexed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.INDEXED,
        chunkCount: result.chunksCreated,
        processingCompletedAt: new Date(),
        processingProgress: 100,
        processingStep: null,
        wordCount,
        pageCount: metadata.pageCount,
        title: metadata.title,
        author: metadata.author,
        language: metadata.language,
      },
    });

    await publishProgress(documentId, DocumentStatus.INDEXED, 100, null);

    console.log(`Document ${documentId} indexed: ${result.chunksCreated} chunks, ${wordCount} words`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to process document ${documentId}: ${errorMessage}`);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.FAILED,
        errorMessage,
        processingCompletedAt: new Date(),
      },
    });

    await publishProgress(documentId, DocumentStatus.FAILED, 0, null, errorMessage);

    // Re-throw for BullMQ retry
    throw error;
  }
}
