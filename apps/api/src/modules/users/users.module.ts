import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { AuthGuard } from '../auth';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, AuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
