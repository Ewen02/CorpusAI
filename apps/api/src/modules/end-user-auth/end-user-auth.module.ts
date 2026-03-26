import { Module } from '@nestjs/common';
import { EndUserAuthController } from './end-user-auth.controller';
import { EndUserAuthService } from './end-user-auth.service';
import { EndUserAuthGuard } from './end-user-auth.guard';

@Module({
  controllers: [EndUserAuthController],
  providers: [EndUserAuthService, EndUserAuthGuard],
  exports: [EndUserAuthService, EndUserAuthGuard],
})
export class EndUserAuthModule {}

export { EndUserAuthGuard } from './end-user-auth.guard';
export { CurrentEndUser } from './current-end-user.decorator';
