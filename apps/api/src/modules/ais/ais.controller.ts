import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AIsService } from './ais.service';
import { MailService } from '../mail';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { CreateAIDto } from './dto/create-ai.dto';
import { UpdateAIDto } from './dto/update-ai.dto';
import {
  SetAccessModeDto,
  SetAccessCodeDto,
  UpdateInviteOnlyDto,
  InviteMemberDto,
} from './dto/access.dto';

@ApiTags('ais')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@SkipThrottle({ short: true, medium: true, long: true })
@Controller('ais')
export class AIsController {
  constructor(
    private readonly aisService: AIsService,
    private readonly mailService: MailService,
    private readonly config: ConfigService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all AIs for current user' })
  @ApiResponse({ status: 200, description: 'List of AIs returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.aisService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AI by ID' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  @ApiResponse({ status: 200, description: 'AI returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.aisService.findOne(user.id, id);
  }

  @Post(':id/generate-suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI field suggestions from indexed documents' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  @ApiResponse({ status: 200, description: 'Suggestions generated successfully' })
  @ApiResponse({ status: 400, description: 'No indexed documents found' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async generateSuggestions(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.aisService.generateSuggestions(user.id, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get AI statistics' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  @ApiResponse({ status: 200, description: 'AI statistics returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async getStats(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.aisService.getStats(user.id, id);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get analytics for a specific AI' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  @ApiQuery({ name: 'period', enum: ['7d', '30d', '90d'], required: false })
  @ApiResponse({ status: 200, description: 'Analytics data returned' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async getAnalytics(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Query('period') period?: '7d' | '30d' | '90d'
  ) {
    return this.aisService.getAnalytics(user.id, id, period);
  }

  @Get(':id/analytics/documents/:documentId/chunks')
  @ApiOperation({ summary: 'Get chunk usage for a specific document' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiQuery({ name: 'period', enum: ['24h', '7d', '30d', '90d'], required: false })
  @ApiResponse({ status: 200, description: 'Chunk usage data returned' })
  @ApiResponse({ status: 404, description: 'AI or document not found' })
  async getDocumentChunkUsage(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Query('period') period?: '24h' | '7d' | '30d' | '90d'
  ) {
    return this.aisService.getDocumentChunkUsage(user.id, id, documentId, period);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new AI' })
  @ApiResponse({ status: 201, description: 'AI created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateAIDto) {
    return this.aisService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an AI' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  @ApiResponse({ status: 200, description: 'AI updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateAIDto
  ) {
    return this.aisService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an AI' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  @ApiResponse({ status: 200, description: 'AI deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async delete(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.aisService.delete(user.id, id);
  }

  // ============================================
  // Access control endpoints
  // ============================================

  @Post(':id/access/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a secret access token for this AI' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  async generateAccessToken(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return this.aisService.generateAccessToken(user.id, id, frontendUrl);
  }

  @Delete(':id/access/token')
  @ApiOperation({ summary: 'Delete the secret access token' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  async deleteAccessToken(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.aisService.deleteAccessToken(user.id, id);
  }

  @Post(':id/access/code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set an access code for this AI' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  async setAccessCode(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: SetAccessCodeDto
  ) {
    return this.aisService.setAccessCode(user.id, id, dto.code);
  }

  @Delete(':id/access/code')
  @ApiOperation({ summary: 'Remove the access code' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  async deleteAccessCode(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.aisService.deleteAccessCode(user.id, id);
  }

  @Patch(':id/access/mode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch access mode atomically' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  async setAccessMode(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: SetAccessModeDto
  ) {
    return this.aisService.setAccessMode(user.id, id, dto.mode);
  }

  @Patch(':id/access/invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle invite-only mode' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  async updateInviteOnly(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateInviteOnlyDto
  ) {
    return this.aisService.updateInviteOnly(user.id, id, dto.inviteOnly);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List members with active access grants' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  async getMembers(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.aisService.getMembers(user.id, id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Invite a member to access this AI' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  async inviteMember(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return this.aisService.inviteMember(
      user.id,
      id,
      dto.email,
      dto.name,
      this.mailService,
      frontendUrl,
      user.name || user.email
    );
  }

  @Delete(':id/members/:endUserId')
  @ApiOperation({ summary: 'Revoke a member access' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  @ApiParam({ name: 'endUserId', description: 'EndUser ID' })
  async revokeMember(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('endUserId') endUserId: string
  ) {
    return this.aisService.revokeMember(user.id, id, endUserId);
  }
}
