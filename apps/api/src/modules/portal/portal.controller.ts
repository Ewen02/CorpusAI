import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { EndUser } from '@corpusai/database';
import { EndUserAuthGuard, CurrentEndUser } from '../end-user-auth';
import { PortalService } from './portal.service';

@ApiTags('portal')
@Controller('portal')
@UseGuards(EndUserAuthGuard)
export class PortalController {
  constructor(private readonly service: PortalService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get end-user profile and accessible AIs' })
  getMe(@CurrentEndUser() endUser: EndUser) {
    return this.service.getMe(endUser);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List end-user conversations' })
  getConversations(@CurrentEndUser() endUser: EndUser) {
    return this.service.getConversations(endUser);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a specific conversation with messages' })
  getConversation(@CurrentEndUser() endUser: EndUser, @Param('id') id: string) {
    return this.service.getConversation(endUser, id);
  }
}
