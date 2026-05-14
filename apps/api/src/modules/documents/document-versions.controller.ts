import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { DocumentVersionsService } from './document-versions.service';
import { DocumentVersionDto, RollbackResponseDto } from './dto/document-version.dto';

/**
 * Endpoints to list past versions of a document and roll back to a previous one.
 * Mounted under `/documents/:id` because version operations are scoped to a
 * document — not to the parent AI.
 */
@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Throttle({ short: { limit: 10, ttl: 1000 } })
@Controller('documents/:id')
export class DocumentVersionsController {
  constructor(private readonly versionsService: DocumentVersionsService) {}

  @Get('versions')
  @ApiOperation({
    summary: 'List all versions of a document (newest first)',
    description:
      'Returns the list of `DocumentVersion` rows attached to the document. ' +
      'The currently-active version has `isActive=true`.',
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Versions returned', type: [DocumentVersionDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async list(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.versionsService.listVersions(user.id, id);
  }

  @Post('rollback/:versionId')
  @ApiOperation({
    summary: 'Roll back a document to a past version',
    description:
      'Marks `versionId` as the active version, re-upserts its persisted chunks ' +
      'into Qdrant and deactivates the previously-active version. Idempotent: ' +
      'rolling back to the already-active version returns `{ changed: false }` ' +
      'without touching the vector store.',
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiParam({ name: 'versionId', description: 'Version ID to restore' })
  @ApiResponse({ status: 201, description: 'Rollback performed', type: RollbackResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document or version not found' })
  async rollback(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('versionId') versionId: string
  ) {
    return this.versionsService.rollback(user.id, id, versionId);
  }
}
