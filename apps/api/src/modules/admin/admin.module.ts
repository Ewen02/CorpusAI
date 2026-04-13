import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { EvalReportsService } from './eval-reports.service';
import { AuthGuard } from '../auth';
import { DocumentsModule } from '../documents';

@Module({
  imports: [ConfigModule, DocumentsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository, EvalReportsService, AuthGuard],
})
export class AdminModule {}
