import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AIsService } from './ais.service';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { CreateAIDto } from './dto/create-ai.dto';
import { UpdateAIDto } from './dto/update-ai.dto';

@ApiTags('ais')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('ais')
export class AIsController {
  constructor(private readonly aisService: AIsService) {}

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

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get AI statistics' })
  @ApiParam({ name: 'id', description: 'AI ID' })
  @ApiResponse({ status: 200, description: 'AI statistics returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI not found' })
  async getStats(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.aisService.getStats(user.id, id);
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
}
