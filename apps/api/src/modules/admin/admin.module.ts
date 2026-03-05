import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AuthGuard],
})
export class AdminModule {}
