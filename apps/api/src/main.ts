import { initSentry } from './lib/sentry';
// Sentry must be initialized before any other imports
initSentry();

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.useLogger(app.get(PinoLogger));

  const config = app.get(ConfigService);
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const frontendUrl = config.get<string>('FRONTEND_URL')!;
  const port = config.get<number>('PORT') || 3001;

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://*.sentry.io'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      crossOriginEmbedderPolicy: false, // Required for Sentry and external resources
    })
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Swagger documentation (dev only)
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CorpusAI API')
      .setDescription('API for CorpusAI - Transform your knowledge into AI')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDoc);
  }

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`CorpusAI API running on http://localhost:${port}`);
  if (!isProd) {
    logger.log(`Swagger docs at http://localhost:${port}/docs`);
  }
}

bootstrap();
