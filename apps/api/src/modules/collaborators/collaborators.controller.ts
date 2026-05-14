import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CollaboratorRole } from '@corpusai/database';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { CollaboratorsService } from './collaborators.service';
import { InviteCollaboratorDto } from './dto/invite-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';

@ApiTags('collaborators')
@Controller()
export class CollaboratorsController {
  constructor(
    private readonly collaboratorsService: CollaboratorsService,
    private readonly config: ConfigService
  ) {}

  // ============================================
  // AI-scoped collaborator management (owner-only)
  // ============================================

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get('ais/:aiId/collaborators')
  @ApiOperation({ summary: 'List collaborators for an AI (owner-only)' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiResponse({ status: 200, description: 'List of collaborators returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found or not owned' })
  async list(@Param('aiId') aiId: string, @CurrentUser() user: CurrentUserData) {
    return this.collaboratorsService.list(aiId, user.id);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post('ais/:aiId/collaborators')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a collaborator by email (owner-only)' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiResponse({ status: 201, description: 'Invitation created and email sent' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found or not owned' })
  @ApiResponse({ status: 409, description: 'Collaborator already invited' })
  async invite(
    @Param('aiId') aiId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: InviteCollaboratorDto
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return this.collaboratorsService.invite(
      aiId,
      user.id,
      user.name || user.email,
      dto.email,
      dto.role ?? CollaboratorRole.EDITOR,
      frontendUrl
    );
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Patch('ais/:aiId/collaborators/:id')
  @ApiOperation({ summary: 'Update a collaborator role (owner-only)' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiParam({ name: 'id', description: 'Collaborator ID' })
  @ApiResponse({ status: 200, description: 'Collaborator role updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI or collaborator not found' })
  async updateRole(
    @Param('aiId') aiId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateCollaboratorDto
  ) {
    return this.collaboratorsService.updateRole(aiId, id, user.id, dto.role);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Delete('ais/:aiId/collaborators/:id')
  @ApiOperation({ summary: 'Revoke a collaborator (owner-only)' })
  @ApiParam({ name: 'aiId', description: 'AI ID' })
  @ApiParam({ name: 'id', description: 'Collaborator ID' })
  @ApiResponse({ status: 200, description: 'Collaborator revoked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI or collaborator not found' })
  async revoke(
    @Param('aiId') aiId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData
  ) {
    return this.collaboratorsService.revoke(aiId, id, user.id);
  }

  // ============================================
  // Invite acceptance (authenticated user via cookie session)
  // ============================================

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post('collaborators/invites/:token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Accept a collaboration invitation. The current authenticated user becomes the collaborator. Email must match the invite recipient.',
  })
  @ApiParam({ name: 'token', description: 'Invitation token (plaintext, single-use)' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  @ApiResponse({ status: 400, description: 'Invitation expired or already accepted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Email does not match the invited address' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async accept(@Param('token') token: string, @CurrentUser() user: CurrentUserData) {
    return this.collaboratorsService.accept(token, user.id, user.email);
  }
}
