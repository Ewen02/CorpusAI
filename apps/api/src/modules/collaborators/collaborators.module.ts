import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorsService } from './collaborators.service';
import { CollaboratorsRepository } from './collaborators.repository';

@Module({
  imports: [ConfigModule],
  controllers: [CollaboratorsController],
  providers: [CollaboratorsService, CollaboratorsRepository],
  exports: [CollaboratorsService],
})
export class CollaboratorsModule {}
