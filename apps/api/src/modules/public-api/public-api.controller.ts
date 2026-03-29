import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  HttpCode,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { ApiKeyGuard, type ApiKeyRequest } from '../auth/api-key.guard';
import { PublicApiService } from './public-api.service';
import { QueryPublicApiDto } from './dto/query.dto';
import { ApiKeyRateLimitInterceptor } from './api-key-rate-limit.interceptor';

// Decorator to extract userId from API key request
const ApiKeyUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<ApiKeyRequest>();
  return request.apiKeyUserId;
});

// ── API Key Management (authenticated with session) ──

@ApiTags('api-keys')
@UseGuards(AuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private publicApiService: PublicApiService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  async create(@CurrentUser() user: CurrentUserData, @Body('name') name: string) {
    return this.publicApiService.createApiKey(user.id, name || 'Default');
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys' })
  async list(@CurrentUser() user: CurrentUserData) {
    return this.publicApiService.listApiKeys(user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an API key' })
  async delete(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    await this.publicApiService.deleteApiKey(user.id, id);
  }
}

// ── Public API (authenticated with API key) ──

@ApiTags('v1')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@UseInterceptors(ApiKeyRateLimitInterceptor)
@Controller('v1')
export class PublicApiController {
  constructor(private publicApiService: PublicApiService) {}

  @Post('query')
  @ApiOperation({ summary: 'Query an AI assistant' })
  async query(@ApiKeyUser() userId: string, @Body() dto: QueryPublicApiDto) {
    return this.publicApiService.query(userId, dto.slug, dto.question);
  }

  @Get('ais')
  @ApiOperation({ summary: 'List your AI assistants' })
  async listAIs(@ApiKeyUser() userId: string) {
    return this.publicApiService.listUserAIs(userId);
  }
}
