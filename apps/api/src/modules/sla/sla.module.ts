import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../infrastructure/database';
import { AuthGuard } from '../auth';
import { SLAController } from './sla.controller';
import { SLAService } from './sla.service';
import { SLARepository } from './sla.repository';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [SLAController],
  providers: [SLAService, SLARepository, AuthGuard],
  exports: [SLAService],
})
export class SLAModule {}
