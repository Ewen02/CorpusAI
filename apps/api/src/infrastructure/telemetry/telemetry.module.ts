import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelemetryService } from './telemetry.service';

/**
 * Module global de télémétrie produit (PostHog).
 * Global pour éviter d'importer le module dans chaque feature qui capture.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
