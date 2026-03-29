import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@ApiTags('webhooks')
@UseGuards(AuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhooks' })
  async list(@CurrentUser() user: CurrentUserData) {
    return this.webhooksService.list(user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a webhook' })
  async delete(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    await this.webhooksService.delete(user.id, id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a test ping to a webhook' })
  async test(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.webhooksService.test(user.id, id);
  }
}
