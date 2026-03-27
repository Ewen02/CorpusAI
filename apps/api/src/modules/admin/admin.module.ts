import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EvalReportsService } from './eval-reports.service';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  imports: [ConfigModule],
  controllers: [AdminController],
  providers: [AdminService, EvalReportsService, AuthGuard],
})
export class AdminModule {}
