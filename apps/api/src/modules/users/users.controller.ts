import { Controller, Get, Patch, Delete, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthGuard, CurrentUser, type CurrentUserData } from '../auth';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@CurrentUser() user: CurrentUserData, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getDashboardStats(user.id);
  }

  @Get('me/accounts')
  @ApiOperation({ summary: "Get user's connected accounts (OAuth providers)" })
  @ApiResponse({ status: 200, description: 'Connected OAuth accounts returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAccounts(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getAccounts(user.id);
  }

  @Get('me/usage')
  @ApiOperation({ summary: 'Get current usage and remaining quotas for the subscription plan' })
  @ApiResponse({ status: 200, description: 'Usage data returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsage(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getUsage(user.id);
  }

  @Get('me/analytics')
  @ApiOperation({ summary: 'Get analytics data with trends' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d'] })
  @ApiResponse({ status: 200, description: 'Analytics data returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAnalytics(
    @CurrentUser() user: CurrentUserData,
    @Query('period') period?: '7d' | '30d' | '90d'
  ) {
    return this.usersService.getAnalytics(user.id, period || '30d');
  }

  @Delete('me')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete current user account and all data' })
  @ApiResponse({ status: 204, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@CurrentUser() user: CurrentUserData) {
    await this.usersService.deleteAccount(user.id);
  }
}
