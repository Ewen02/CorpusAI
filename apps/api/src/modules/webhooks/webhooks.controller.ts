import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { PaginationDto } from '../../shared/pagination.dto';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { TestWebhookDto } from './dto/test-webhook.dto';

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

  @Get(':id')
  @ApiOperation({ summary: 'Get a single webhook (without secret)' })
  async getOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.webhooksService.getById(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a webhook' })
  async delete(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    await this.webhooksService.delete(user.id, id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a test event payload to a webhook' })
  async test(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: TestWebhookDto
  ) {
    return this.webhooksService.test(user.id, id, dto.eventType);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'List recent delivery attempts for a webhook' })
  async deliveries(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Query() pagination: PaginationDto
  ) {
    return this.webhooksService.listDeliveries(user.id, id, pagination.skip, pagination.take);
  }

  @Post(':id/deliveries/:deliveryId/retry')
  @ApiOperation({ summary: 'Retry a previous webhook delivery' })
  async retry(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string
  ) {
    return this.webhooksService.retryDelivery(user.id, id, deliveryId);
  }
}
