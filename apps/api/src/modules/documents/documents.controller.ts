import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Inject,
  Sse,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
  MessageEvent,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import archiver from 'archiver';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import type { EventEmitter } from 'node:events';
import { EVENT_BUS, type IEventBus } from '../../infrastructure/redis';
import type { DocumentProgressEvent } from '@corpusai/queue';
import { DocumentsService } from './documents.service';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateTextDocumentDto } from './dto/create-text-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Throttle({ short: { limit: 10, ttl: 1000 } })
@Controller('ais/:aiId/documents')
export class DocumentsController {
  private readonly progressEmitter: EventEmitter;

  constructor(
    private readonly documentsService: DocumentsService,
    @Inject(EVENT_BUS) eventBus: IEventBus
  ) {
    this.progressEmitter = eventBus.getEmitter();
  }

  @Get()
  @ApiOperation({ summary: 'List all documents for an AI' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiResponse({ status: 200, description: 'List of documents returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async findAll(@CurrentUser() user: CurrentUserData, @Param('aiId') aiId: string) {
    return this.documentsService.findAllByAI(user.id, aiId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export AI corpus as ZIP archive' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiResponse({ status: 200, description: 'ZIP archive streamed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async exportCorpus(
    @CurrentUser() user: CurrentUserData,
    @Param('aiId') aiId: string,
    @Res() res: Response
  ) {
    const { ai, documents } = await this.documentsService.getExportData(user.id, aiId);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="corpus-export-${ai.slug}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res as unknown as NodeJS.WritableStream);

    // metadata.json
    archive.append(
      JSON.stringify(
        {
          id: ai.id,
          name: ai.name,
          slug: ai.slug,
          description: ai.description,
          documentCount: documents.length,
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      { name: 'metadata.json' }
    );

    // documents/*.txt — reconstructed text from chunks
    for (const doc of documents) {
      const text = doc.chunks.map((c) => c.content).join('\n\n');
      archive.append(text, { name: `documents/${doc.filename}.txt` });
    }

    // chunks.jsonl — raw chunks for advanced use
    const chunksLines = documents.flatMap((doc) =>
      doc.chunks.map((chunk) =>
        JSON.stringify({
          documentId: doc.id,
          filename: doc.filename,
          position: chunk.position,
          pageNumber: chunk.pageNumber,
          content: chunk.content,
        })
      )
    );
    archive.append(chunksLines.join('\n'), { name: 'chunks.jsonl' });

    await archive.finalize();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.documentsService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new document (after upload)' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Param('aiId') aiId: string,
    @Body() dto: CreateDocumentDto
  ) {
    return this.documentsService.create(user.id, aiId, dto);
  }

  @Post('text')
  @ApiOperation({ summary: 'Create a document from text content' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiResponse({ status: 201, description: 'Text document created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async createFromText(
    @CurrentUser() user: CurrentUserData,
    @Param('aiId') aiId: string,
    @Body() dto: CreateTextDocumentDto
  ) {
    return this.documentsService.createFromText(user.id, aiId, dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document file directly' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiResponse({ status: 201, description: 'File uploaded and document created' })
  @ApiResponse({ status: 400, description: 'No file provided or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, DOCX, TXT, MD, CSV, HTML)',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    })
  )
  async upload(
    @CurrentUser() user: CurrentUserData,
    @Param('aiId') aiId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 })],
      })
    )
    file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.documentsService.createFromUpload(user.id, aiId, file);
  }

  @Post('upload-bulk')
  @ApiOperation({ summary: 'Upload multiple document files at once' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiResponse({ status: 201, description: 'Files uploaded and documents created' })
  @ApiResponse({ status: 400, description: 'No files provided or validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Document files (PDF, DOCX, TXT, MD)',
        },
      },
      required: ['files'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 500 * 1024 * 1024 },
    })
  )
  async uploadBulk(
    @CurrentUser() user: CurrentUserData,
    @Param('aiId') aiId: string,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return this.documentsService.createFromBulkUpload(user.id, aiId, files);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async delete(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.documentsService.delete(user.id, id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry processing a failed document' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 201, description: 'Document processing retried' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async retry(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.documentsService.retryProcessing(user.id, id);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Get document processing progress' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document progress returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getProgress(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.documentsService.getProgress(user.id, id);
  }

  @Sse(':id/progress/stream')
  @ApiOperation({ summary: 'Stream document processing progress via SSE' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'SSE stream of document progress events' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  streamProgress(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      this.documentsService
        .getProgress(user.id, id)
        .then((doc) => {
          subscriber.next({
            data: { documentId: id, status: doc.status, progress: doc.progress, step: doc.step },
          } as MessageEvent);

          if (doc.status === 'INDEXED' || doc.status === 'FAILED') {
            subscriber.complete();
            return;
          }

          // Listen to shared progress emitter (single Redis connection for all SSE clients)
          const onProgress = (event: DocumentProgressEvent) => {
            if (event.documentId !== id) return;

            subscriber.next({ data: event } as MessageEvent);

            if (event.status === 'INDEXED' || event.status === 'FAILED') {
              this.progressEmitter.removeListener('progress', onProgress);
              subscriber.complete();
            }
          };

          this.progressEmitter.on('progress', onProgress);

          const timeout = setTimeout(() => {
            this.progressEmitter.removeListener('progress', onProgress);
            subscriber.complete();
          }, 10 * 60_000);

          subscriber.add(() => {
            clearTimeout(timeout);
            this.progressEmitter.removeListener('progress', onProgress);
          });
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }
}
