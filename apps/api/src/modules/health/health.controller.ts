import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import Redis from 'ioredis';
import { parseRedisUrl } from '@corpusai/queue';
import { PrismaService } from '../../infrastructure/database';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  private redis: Redis | null = null;

  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private config: ConfigService,
    private prisma: PrismaService
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis({
        ...parseRedisUrl(redisUrl),
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true,
      });
      this.redis.on('error', () => {
        // Silently handle connection errors — health check will report status
      });
    }
  }

  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (DB + Redis)' })
  @ApiResponse({ status: 200, description: 'All dependencies are ready' })
  @ApiResponse({ status: 503, description: 'One or more dependencies are down' })
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    const checks = [() => this.prismaHealth.pingCheck('database', this.prisma.client)];

    if (this.redis) {
      checks.push(() => this.checkRedis());
    }

    return this.health.check(checks);
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      const result = await this.redis!.ping();
      if (result === 'PONG') {
        return { redis: { status: 'up' } };
      }
      throw new Error(`Unexpected Redis ping response: ${result}`);
    } catch (error) {
      throw new Error(`Redis health check failed: ${error}`);
    }
  }
}
