import * as fs from 'node:fs/promises';
import { prisma, DocumentStatus, ProcessingStep } from '@corpusai/database';
import { DocumentParserService, type ProcessingStage } from '@corpusai/corpus';
import type { DocumentProcessingJobData, DocumentProgressEvent } from '@corpusai/queue';
import { logger } from '../lib/logger';
import { getProgressService } from '../services/progress.service';
import { createPipelineForAI } from '../services/rag-factory';

const parserService = new DocumentParserService();

function mapStageToStep(stage: ProcessingStage): ProcessingStep {
  switch (stage) {
    case 'chunking':
      return ProcessingStep.CHUNKING;
    case 'enriching':
      return ProcessingStep.EMBEDDING;
    case 'embedding':
      return ProcessingStep.EMBEDDING;
    case 'storing':
      return ProcessingStep.STORING;
    default:
      return ProcessingStep.CHUNKING;
  }
}

// Per-document throttle state for the DB fallback write. Redis is the source of
// truth for SSE, so processingProgress in Postgres is only a fallback and does
// not need a row write on every embedding-batch tick.
const PROGRESS_DB_WRITE_THRESHOLD = 10;

interface LastDbWrite {
  status: DocumentStatus;
  step: ProcessingStep | null;
  progress: number;
}

const lastDbWrite = new Map<string, LastDbWrite>();

async function publishProgress(
  documentId: string,
  status: DocumentStatus,
  progress: number,
  step: ProcessingStep | null,
  errorMessage?: string
): Promise<void> {
  const progressService = getProgressService();
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Decide whether this tick warrants a Postgres write. Status transitions
  // (PROCESSING/INDEXED/FAILED) and step changes always write; otherwise only
  // write once progress has advanced by the threshold since the last DB write.
  const previous = lastDbWrite.get(documentId);
  const isTerminal = status === DocumentStatus.INDEXED || status === DocumentStatus.FAILED;
  const statusChanged = previous?.status !== status;
  const stepChanged = previous?.step !== step;
  const progressAdvanced =
    previous === undefined || clampedProgress - previous.progress >= PROGRESS_DB_WRITE_THRESHOLD;
  const shouldWriteDb = isTerminal || statusChanged || stepChanged || progressAdvanced;

  if (shouldWriteDb) {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        processingProgress: clampedProgress,
        processingStep: step,
        ...(isTerminal ? { processingCompletedAt: new Date() } : {}),
        ...(status === DocumentStatus.INDEXED ? { processingStep: null } : {}),
        ...(errorMessage ? { errorMessage } : {}),
      },
    });

    if (isTerminal) {
      lastDbWrite.delete(documentId);
    } else {
      lastDbWrite.set(documentId, { status, step, progress: clampedProgress });
    }
  }

  // Publish to Redis for SSE — every tick, unconditionally.
  // Map Prisma enums to queue event string literals (same values, different types)
  await progressService.publish({
    documentId,
    status: status as DocumentProgressEvent['status'],
    progress: clampedProgress,
    step: step as DocumentProgressEvent['step'],
    errorMessage,
  });
}

export async function processDocument(data: DocumentProcessingJobData): Promise<void> {
  const {
    documentId,
    documentVersionId,
    aiId,
    filename,
    mimeType,
    url,
    content,
    buffer,
    filePath,
  } = data;

  // Mark as processing — document + version in one transaction so the version
  // can't be left PENDING while the document flips to PROCESSING.
  await prisma.$transaction([
    prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.PROCESSING,
        processingStartedAt: new Date(),
        processingProgress: 0,
        processingStep: ProcessingStep.PARSING,
      },
    }),
    ...(documentVersionId
      ? [
          prisma.documentVersion.update({
            where: { id: documentVersionId },
            data: { status: DocumentStatus.PROCESSING },
          }),
        ]
      : []),
  ]);

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
      // Parse from filePath, buffer, or URL
      let source: Buffer | string | undefined;
      if (filePath) {
        source = await fs.readFile(filePath);
        // Clean up temp file after reading
        fs.unlink(filePath).catch(() => {});
      } else if (buffer) {
        source = Buffer.from(buffer, 'base64');
      } else {
        source = url;
      }

      if (!source) {
        throw new Error('No content, filePath, buffer, or URL provided');
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
      throw new Error('Document content is empty');
    }

    await publishProgress(documentId, DocumentStatus.PROCESSING, 10, ProcessingStep.PARSING);

    // Index via RAG pipeline
    const pipeline = createPipelineForAI(aiId);

    // Context enrichment applies only to rich document formats (PDF, DOCX)
    const ENRICHABLE_MIME_TYPES = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    const enableContextEnrichment = ENRICHABLE_MIME_TYPES.has(mimeType);

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
        enableContextEnrichment,
        contextEnrichmentConfig: {
          apiKey: process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY,
          baseURL: process.env.LLM_BASE_URL,
          concurrency: 3,
          maxDocumentTokens: 500,
        },
      }
    );

    // Calculate word count if not from parser
    const wordCount =
      metadata.wordCount ?? parsedContent.split(/\s+/).filter((w) => w.length > 0).length;

    // Persist chunks, mark the document INDEXED, and sync the version snapshot
    // atomically so a crash between them can't leave Document=INDEXED with a
    // stale PENDING/PROCESSING DocumentVersion or orphaned chunks.
    await prisma.$transaction([
      // Persist chunks to DB for analytics and text-based features (e.g. AI suggestions).
      // Tag with documentVersionId so rollback can re-upsert past chunks without re-parsing.
      ...(result.chunks.length > 0
        ? [
            prisma.chunk.createMany({
              data: result.chunks.map((c) => ({
                id: c.id,
                documentId,
                documentVersionId: documentVersionId ?? null,
                content: c.text,
                position: c.position,
                pageNumber: c.pageNumber ?? null,
                qdrantPointId: c.id,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
      // Mark as indexed
      prisma.document.update({
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
      }),
      // Keep the DocumentVersion snapshot in sync.
      ...(documentVersionId
        ? [
            prisma.documentVersion.update({
              where: { id: documentVersionId },
              data: {
                status: DocumentStatus.INDEXED,
                chunkCount: result.chunksCreated,
                wordCount,
                pageCount: metadata.pageCount,
                metadata: {
                  ...(metadata.title ? { title: metadata.title } : {}),
                  ...(metadata.author ? { author: metadata.author } : {}),
                  ...(metadata.language ? { language: metadata.language } : {}),
                },
              },
            }),
          ]
        : []),
    ]);

    await publishProgress(documentId, DocumentStatus.INDEXED, 100, null);

    logger.info({ documentId, chunks: result.chunksCreated, wordCount }, 'Document indexed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ documentId, err: error }, 'Failed to process document');

    // Cleanup orphaned vectors in Qdrant (best-effort)
    try {
      const pipeline = createPipelineForAI(aiId);
      await pipeline.deleteDocuments([documentId]);
      logger.info({ documentId, aiId }, 'Cleaned up orphaned vectors after failure');
    } catch (cleanupError) {
      logger.warn({ documentId, aiId, err: cleanupError }, 'Failed to cleanup orphaned vectors');
    }

    // Flip document + version to FAILED atomically so they can't diverge.
    await prisma.$transaction([
      prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage,
          processingCompletedAt: new Date(),
          chunkCount: 0,
        },
      }),
      ...(documentVersionId
        ? [
            prisma.documentVersion.update({
              where: { id: documentVersionId },
              data: {
                status: DocumentStatus.FAILED,
                chunkCount: 0,
              },
            }),
          ]
        : []),
    ]);

    await publishProgress(documentId, DocumentStatus.FAILED, 0, null, errorMessage);

    // Re-throw for BullMQ retry
    throw error;
  }
}
