import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { DocumentsService } from "./documents.service";
import { AuthGuard, CurrentUser, type CurrentUserData } from "../auth";
import { CreateDocumentDto } from "./dto/create-document.dto";

@ApiTags("documents")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("ais/:aiId/documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

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
}
