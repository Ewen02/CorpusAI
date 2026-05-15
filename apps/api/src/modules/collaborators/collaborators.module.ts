import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthGuard } from '../auth';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorsService } from './collaborators.service';
import { CollaboratorsRepository } from './collaborators.repository';

@Module({
  imports: [ConfigModule],
  controllers: [CollaboratorsController],
  providers: [CollaboratorsService, CollaboratorsRepository, AuthGuard],
  exports: [CollaboratorsService],
})
export class CollaboratorsModule {}
