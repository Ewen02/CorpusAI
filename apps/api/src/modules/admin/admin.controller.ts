import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from '../auth';
import { PagePaginationDto, PaginationDto } from '../../shared';
import { AdminService } from './admin.service';
import { EvalReportsService } from './eval-reports.service';
import { UpdateUserRoleDto, UpdateUserPlanDto, RunEvalDto } from './dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private evalReportsService: EvalReportsService
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard totals and rollups' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users (paginated, searchable)' })
  getUsers(@Query() pagination: PagePaginationDto, @Query('search') search?: string) {
    return this.adminService.getUsers(pagination.page, pagination.limit, search);
  }

  @Get('ais')
  @ApiOperation({ summary: 'List AIs (paginated, searchable)' })
  getAIs(@Query() pagination: PagePaginationDto, @Query('search') search?: string) {
    return this.adminService.getAIs(pagination.page, pagination.limit, search);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update a user role' })
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Patch('users/:id/plan')
  @ApiOperation({ summary: 'Update a user subscription plan' })
  updateUserPlan(@Param('id') id: string, @Body() dto: UpdateUserPlanDto) {
    return this.adminService.updateUserPlan(id, dto.plan);
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health (postgres, qdrant, redis, openai, queue)' })
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('tests')
  @ApiOperation({ summary: 'Get test suite status (dev only)' })
  getTestStatus() {
    return this.adminService.getTestStatus();
  }

  @Get('failed-jobs')
  @ApiOperation({ summary: 'List failed document-processing jobs (BullMQ DLQ)' })
  getFailedJobs(@Query() pagination: PaginationDto) {
    return this.adminService.getFailedJobs(pagination.skip, pagination.take);
  }

  @Post('failed-jobs/:jobId/retry')
  @ApiOperation({ summary: 'Retry a failed document-processing job' })
  retryFailedJob(@Param('jobId') jobId: string) {
    return this.adminService.retryFailedJob(jobId);
  }

  @Delete('failed-jobs/:jobId')
  @ApiOperation({ summary: 'Discard a failed document-processing job' })
  discardFailedJob(@Param('jobId') jobId: string) {
    return this.adminService.discardFailedJob(jobId);
  }

  @Get('eval/datasets')
  @ApiOperation({ summary: 'List available RAG eval datasets (dev only)' })
  listEvalDatasets() {
    return this.evalReportsService.listDatasets();
  }

  @Post('eval/run')
  @ApiOperation({ summary: 'Run a RAG evaluation (dev only)' })
  runEval(@Body() dto: RunEvalDto) {
    return this.evalReportsService.runEval(dto.slug, dto.dataset);
  }

  @Get('eval/reports')
  @ApiOperation({ summary: 'List RAG eval reports' })
  listEvalReports(@Query('slug') slug?: string) {
    return this.evalReportsService.listReports(slug);
  }

  @Get('eval/reports/:runId')
  @ApiOperation({ summary: 'Get a RAG eval report by run id' })
  async getEvalReport(@Param('runId') runId: string) {
    const report = await this.evalReportsService.getReport(runId);
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}
