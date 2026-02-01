import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { createDocumentQueue } from "@corpusai/queue";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { RagModule } from "../rag";

@Module({
  imports: [RagModule, ConfigModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    {
      provide: "DOCUMENT_QUEUE",
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>("REDIS_URL");
        if (!redisUrl) {
          throw new Error("REDIS_URL is required for document processing queue");
        }
        return createDocumentQueue(redisUrl);
      },
      inject: [ConfigService],
    },
    {
      provide: "REDIS_URL",
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>("REDIS_URL");
        if (!redisUrl) {
          throw new Error("REDIS_URL is required for SSE progress streaming");
        }
        return redisUrl;
      },
      inject: [ConfigService],
    },
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
