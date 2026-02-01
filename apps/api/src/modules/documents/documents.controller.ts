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
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
  MessageEvent,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Observable } from "rxjs";
import Redis from "ioredis";
import { REDIS_CHANNELS, type DocumentProgressEvent } from "@corpusai/queue";
import { DocumentsService } from "./documents.service";
import { AuthGuard, CurrentUser, type CurrentUserData } from "../auth";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { CreateTextDocumentDto } from "./dto/create-text-document.dto";

@ApiTags("documents")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("ais/:aiId/documents")
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    @Inject("REDIS_URL") private readonly redisUrl: string,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all documents for an AI" })
  @ApiParam({ name: "aiId", description: "AI ID" })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Param("aiId") aiId: string
  ) {
    return this.documentsService.findAllByAI(user.id, aiId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get document by ID" })
  @ApiParam({ name: "aiId", description: "AI ID" })
  @ApiParam({ name: "id", description: "Document ID" })
  async findOne(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ) {
    return this.documentsService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new document (after upload)" })
  @ApiParam({ name: "aiId", description: "AI ID" })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Param("aiId") aiId: string,
    @Body() dto: CreateDocumentDto
  ) {
    return this.documentsService.create(user.id, aiId, dto);
  }

  @Post("text")
  @ApiOperation({ summary: "Create a document from text content" })
  @ApiParam({ name: "aiId", description: "AI ID" })
  async createFromText(
    @CurrentUser() user: CurrentUserData,
    @Param("aiId") aiId: string,
    @Body() dto: CreateTextDocumentDto
  ) {
    return this.documentsService.createFromText(user.id, aiId, dto);
  }

  @Post("upload")
  @ApiOperation({ summary: "Upload a document file directly" })
  @ApiParam({ name: "aiId", description: "AI ID" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Document file (PDF, DOCX, TXT, MD, CSV, HTML)",
        },
      },
      required: ["file"],
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    })
  )
  async upload(
    @CurrentUser() user: CurrentUserData,
    @Param("aiId") aiId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    return this.documentsService.createFromUpload(user.id, aiId, file);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a document" })
  @ApiParam({ name: "aiId", description: "AI ID" })
  @ApiParam({ name: "id", description: "Document ID" })
  async delete(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ) {
    return this.documentsService.delete(user.id, id);
  }

  @Post(":id/retry")
  @ApiOperation({ summary: "Retry processing a failed document" })
  @ApiParam({ name: "aiId", description: "AI ID" })
  @ApiParam({ name: "id", description: "Document ID" })
  async retry(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ) {
    return this.documentsService.retryProcessing(user.id, id);
  }

  @Get(":id/progress")
  @ApiOperation({ summary: "Get document processing progress" })
  @ApiParam({ name: "aiId", description: "AI ID" })
  @ApiParam({ name: "id", description: "Document ID" })
  async getProgress(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ) {
    return this.documentsService.getProgress(user.id, id);
  }

  @Sse(":id/progress/stream")
  @ApiOperation({ summary: "Stream document processing progress via SSE" })
  @ApiParam({ name: "aiId", description: "AI ID" })
  @ApiParam({ name: "id", description: "Document ID" })
  streamProgress(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      this.documentsService.getProgress(user.id, id).then((doc) => {
        subscriber.next({ data: { documentId: id, status: doc.status, progress: doc.progress, step: doc.step } } as MessageEvent);

        if (doc.status === "INDEXED" || doc.status === "FAILED") {
          subscriber.complete();
          return;
        }

        // Subscribe to Redis pub/sub for real-time progress from worker
        const redisSub = new Redis(this.redisUrl, { maxRetriesPerRequest: null });

        redisSub.subscribe(REDIS_CHANNELS.DOCUMENT_PROGRESS).catch((err) => {
          subscriber.error(err);
        });

        redisSub.on("message", (_channel: string, message: string) => {
          try {
            const event = JSON.parse(message) as DocumentProgressEvent;
            if (event.documentId !== id) return;

            subscriber.next({ data: event } as MessageEvent);

            if (event.status === "INDEXED" || event.status === "FAILED") {
              redisSub.unsubscribe().catch(() => {});
              redisSub.quit().catch(() => {});
              subscriber.complete();
            }
          } catch {
            // Ignore malformed messages
          }
        });

        const timeout = setTimeout(() => {
          redisSub.unsubscribe().catch(() => {});
          redisSub.quit().catch(() => {});
          subscriber.complete();
        }, 60_000);

        subscriber.add(() => {
          clearTimeout(timeout);
          redisSub.unsubscribe().catch(() => {});
          redisSub.quit().catch(() => {});
        });
      }).catch((error) => {
        subscriber.error(error);
      });
    });
  }
}
