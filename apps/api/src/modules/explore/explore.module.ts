import { Module } from '@nestjs/common';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';
import { ExploreRepository } from './explore.repository';

@Module({
  controllers: [ExploreController],
  providers: [ExploreService, ExploreRepository],
})
export class ExploreModule {}
