import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database';
import { SLAController } from './sla.controller';
import { SLAService } from './sla.service';
import { SLARepository } from './sla.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [SLAController],
  providers: [SLAService, SLARepository],
  exports: [SLAService],
})
export class SLAModule {}
