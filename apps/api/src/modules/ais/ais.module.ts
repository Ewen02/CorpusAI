import { Module } from '@nestjs/common';
import { AIsController } from './ais.controller';
import { AIsService } from './ais.service';
import { AIsRepository } from './ais.repository';
import { RagModule } from '../rag';

@Module({
  imports: [RagModule],
  controllers: [AIsController],
  providers: [AIsService, AIsRepository],
  exports: [AIsService],
})
export class AIsModule {}
