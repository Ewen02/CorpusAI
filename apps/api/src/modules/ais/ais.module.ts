import { Module } from '@nestjs/common';
import { AIsController } from './ais.controller';
import { AIsService } from './ais.service';
import { AIsRepository } from './ais.repository';
import { RagModule } from '../rag';
import { AuthGuard } from '../auth';

@Module({
  imports: [RagModule],
  controllers: [AIsController],
  providers: [AIsService, AIsRepository, AuthGuard],
  exports: [AIsService],
})
export class AIsModule {}
