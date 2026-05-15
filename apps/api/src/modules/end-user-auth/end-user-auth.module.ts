import { Module } from '@nestjs/common';
import { EndUserAuthController } from './end-user-auth.controller';
import { EndUserAuthService } from './end-user-auth.service';
import { EndUserAuthRepository } from './end-user-auth.repository';
import { EndUserAuthGuard } from './end-user-auth.guard';

@Module({
  controllers: [EndUserAuthController],
  providers: [EndUserAuthService, EndUserAuthRepository, EndUserAuthGuard],
  exports: [EndUserAuthService, EndUserAuthGuard, EndUserAuthRepository],
})
export class EndUserAuthModule {}
