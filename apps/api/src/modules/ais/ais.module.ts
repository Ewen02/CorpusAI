import { Module } from "@nestjs/common";
import { AIsController } from "./ais.controller";
import { AIsService } from "./ais.service";

@Module({
  controllers: [AIsController],
  providers: [AIsService],
  exports: [AIsService],
})
export class AIsModule {}
