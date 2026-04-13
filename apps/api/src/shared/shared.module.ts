import { Global, Module } from '@nestjs/common';
import { OwnershipService } from './ownership.service';
import { OwnershipRepository } from './ownership.repository';

@Global()
@Module({
  providers: [OwnershipService, OwnershipRepository],
  exports: [OwnershipService],
})
export class SharedModule {}
