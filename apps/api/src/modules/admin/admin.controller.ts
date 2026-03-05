import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string
  ) {
    return this.adminService.getUsers(page, limit, search);
  }

  @Get('ais')
  getAIs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string
  ) {
    return this.adminService.getAIs(page, limit, search);
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body('role') role: 'USER' | 'ADMIN') {
    return this.adminService.updateUserRole(id, role);
  }

  @Patch('users/:id/plan')
  updateUserPlan(
    @Param('id') id: string,
    @Body('plan') plan: 'FREE' | 'CREATOR' | 'PRO' | 'ENTERPRISE'
  ) {
    return this.adminService.updateUserPlan(id, plan);
  }

  @Get('health')
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }
}
