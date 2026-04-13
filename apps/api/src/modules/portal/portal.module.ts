import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { EndUserAuthModule } from '../end-user-auth';

@Module({
  imports: [EndUserAuthModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
