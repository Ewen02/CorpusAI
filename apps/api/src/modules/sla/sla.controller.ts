import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { AdminGuard } from '../auth';
import { SLAService, type SLAReport } from './sla.service';

class SLAQueryDto {
  @IsOptional()
  @IsIn(['24h', '7d', '30d'])
  window?: SLAReport['window'];
}

@ApiTags('admin')
@Controller('admin/sla')
@UseGuards(AdminGuard)
export class SLAController {
  constructor(private readonly service: SLAService) {}

  @Get()
  @ApiOperation({
    summary:
      'Service-level indicators (p50/p95/p99 latency, success rate) for the requested window',
  })
  getReport(@Query() query: SLAQueryDto): Promise<SLAReport> {
    return this.service.getReport(query.window ?? '24h');
  }
}
