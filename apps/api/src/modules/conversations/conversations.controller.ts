import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Headers,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
} from "@nestjs/swagger";
import { ConversationsService } from "./conversations.service";
import { AuthGuard, CurrentUser, type CurrentUserData } from "../auth";
import { SendMessageDto } from "./dto/send-message.dto";

@ApiTags("conversations")
@Controller()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  // ============================================
  // Creator endpoints (authenticated)
  // ============================================

  @Get("ais/:aiId/conversations")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "List all conversations for an AI (creator view)" })
  @ApiParam({ name: "aiId", description: "AI ID" })
  async findAllByAI(
    @CurrentUser() user: CurrentUserData,
    @Param("aiId") aiId: string
  ) {
    return this.conversationsService.findAllByAI(user.id, aiId);
  }

  @Delete("conversations/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Delete a conversation (creator only)" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  async delete(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ) {
    return this.conversationsService.delete(user.id, id);
  }

  // ============================================
  // Public endpoints (for widget/end users)
  // ============================================

  @Post("chat/:aiSlug/start")
  @ApiOperation({ summary: "Start a new conversation with an AI" })
  @ApiParam({ name: "aiSlug", description: "AI slug" })
  @ApiHeader({ name: "x-session-id", required: false, description: "End user session ID" })
  async startConversation(
    @Param("aiSlug") aiSlug: string,
    @Headers("x-session-id") sessionId?: string
  ) {
    return this.conversationsService.create(aiSlug, sessionId);
  }

  @Get("chat/conversations/:id")
  @ApiOperation({ summary: "Get conversation with messages" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  async getConversation(@Param("id") id: string) {
    return this.conversationsService.findOne(id);
  }

  @Post("chat/conversations/:id/messages")
  @ApiOperation({ summary: "Send a message in a conversation" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  async sendMessage(
    @Param("id") id: string,
    @Body() dto: SendMessageDto
  ) {
    return this.conversationsService.sendMessage(id, dto.content);
  }
}
