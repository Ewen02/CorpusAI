import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Headers,
  Res,
} from '@nestjs/common';
import { ConversationSource } from '@corpusai/database';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ConversationsService } from './conversations.service';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('conversations')
@Controller()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  // ============================================
  // Creator endpoints (authenticated)
  // ============================================

  @Get('ais/:aiId/conversations')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List all conversations for an AI (creator view)' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiResponse({ status: 200, description: 'List of conversations returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async findAllByAI(
    @CurrentUser() user: CurrentUserData,
    @Param('aiId') aiId: string,
    @Query('source') source?: string
  ) {
    const conversationSource = source ? (source as ConversationSource) : undefined;
    return this.conversationsService.findAllByAI(user.id, aiId, conversationSource);
  }

  @Delete('conversations/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete a conversation (creator only)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async delete(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.conversationsService.delete(user.id, id);
  }

  // ============================================
  // Public endpoints (for widget/end users)
  // ============================================

  @Get('chat/:aiSlug/info')
  @ApiOperation({ summary: 'Get public AI info for widget' })
  @ApiParam({ name: 'aiSlug', description: 'AI slug' })
  @ApiResponse({ status: 200, description: 'Public AI info returned' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async getAIPublicInfo(@Param('aiSlug') aiSlug: string) {
    return this.conversationsService.getAIPublicInfo(aiSlug);
  }

  @Post('chat/:aiSlug/start')
  @ApiOperation({ summary: 'Start a new conversation with an AI' })
  @ApiParam({ name: 'aiSlug', description: 'AI slug' })
  @ApiHeader({ name: 'x-access-token', required: false, description: 'Secret link token' })
  @ApiHeader({ name: 'x-access-code', required: false, description: 'Access code' })
  @ApiHeader({
    name: 'x-conversation-source',
    required: false,
    description: 'Conversation source: DASHBOARD | WIDGET | PUBLIC',
  })
  @ApiResponse({ status: 201, description: 'Conversation started' })
  @ApiResponse({ status: 401, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async startConversation(
    @Param('aiSlug') aiSlug: string,
    @Req() req: Request,
    @Headers('x-access-token') accessToken?: string,
    @Headers('x-access-code') accessCode?: string,
    @Headers('x-conversation-source') source?: string
  ) {
    const conversationSource = (source as ConversationSource) ?? ConversationSource.DASHBOARD;
    const euSession = (req as Request & { cookies?: Record<string, string> }).cookies?.[
      'eu_session'
    ];
    return this.conversationsService.create(
      aiSlug,
      euSession,
      conversationSource,
      accessToken,
      accessCode
    );
  }

  @Get('chat/conversations/:id')
  @ApiOperation({ summary: 'Get conversation with messages' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation with messages returned' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }

  @Get('chat/conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'List of messages returned' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(@Param('id') id: string) {
    return this.conversationsService.getMessages(id);
  }

  // NOTE: Stream route must be declared BEFORE the non-stream route
  // to prevent NestJS from matching /messages/stream as /messages with id="stream"
  @Throttle({ short: { limit: 1, ttl: 1000 }, medium: { limit: 10, ttl: 60000 } })
  @Post('chat/conversations/:id/messages/stream')
  @ApiOperation({ summary: 'Send a message with streaming response (SSE)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'SSE stream of AI response tokens' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessageStream(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Abort streaming if client disconnects
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    try {
      const generator = this.conversationsService.sendMessageStream(id, dto.content);

      for await (const event of generator) {
        if (clientDisconnected) break;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      if (!clientDisconnected) {
        res.write(
          `data: ${JSON.stringify({ type: 'error', data: { message: 'Internal server error' } })}\n\n`
        );
      }
    }

    res.end();
  }

  @Throttle({ short: { limit: 1, ttl: 1000 }, medium: { limit: 10, ttl: 60000 } })
  @Post('chat/conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Message sent and AI response returned' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.conversationsService.sendMessage(id, dto.content);
  }
}
