import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@corpusai/database';

const DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private dashboardCache: { data: unknown; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  async getDashboard() {
    if (this.dashboardCache && Date.now() < this.dashboardCache.expiresAt) {
      return this.dashboardCache.data;
    }

    const [userCount, aiCount, documentCount, conversationCount, messageCount] = await Promise.all([
      prisma.user.count(),
      prisma.aI.count(),
      prisma.document.count(),
      prisma.conversation.count(),
      prisma.message.count(),
    ]);

    // Users by plan
    const usersByPlan = await prisma.user.groupBy({
      by: ['subscriptionPlan'],
      _count: true,
    });

    // Documents by status
    const documentsByStatus = await prisma.document.groupBy({
      by: ['status'],
      _count: true,
    });

    // Recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSignups = await prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    // Top AIs by conversations
    const topAIs = await prisma.aI.findMany({
      orderBy: { conversationCount: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        conversationCount: true,
        questionCount: true,
        documentCount: true,
        user: { select: { email: true, name: true } },
      },
    });

    // Failed docs rate
    const failedDocs =
      documentCount > 0 ? await prisma.document.count({ where: { status: 'FAILED' } }) : 0;

    const result = {
      totals: {
        users: userCount,
        ais: aiCount,
        documents: documentCount,
        conversations: conversationCount,
        messages: messageCount,
      },
      usersByPlan: usersByPlan.map((g: { subscriptionPlan: string; _count: number }) => ({
        plan: g.subscriptionPlan,
        count: g._count,
      })),
      documentsByStatus: documentsByStatus.map((g: { status: string; _count: number }) => ({
        status: g.status,
        count: g._count,
      })),
      recentSignups,
      topAIs,
      failedDocsRate: documentCount > 0 ? Math.round((failedDocs / documentCount) * 100) : 0,
    };

    this.dashboardCache = { data: result, expiresAt: Date.now() + DASHBOARD_CACHE_TTL };
    return result;
  }

  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          username: true,
          role: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          createdAt: true,
          _count: {
            select: { ais: true, dailyStats: true },
          },
          sessions: {
            orderBy: { updatedAt: 'desc' as const },
            take: 1,
            select: { updatedAt: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAIs(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [ais, total] = await Promise.all([
      prisma.aI.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          isPublic: true,
          accessType: true,
          documentCount: true,
          conversationCount: true,
          questionCount: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
      prisma.aI.count({ where }),
    ]);

    return {
      ais,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
  }

  async updateUserPlan(userId: string, plan: 'FREE' | 'CREATOR' | 'PRO' | 'ENTERPRISE') {
    return prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: plan === 'FREE' ? 'ACTIVE' : undefined,
      },
      select: {
        id: true,
        email: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
      },
    });
  }

  async getSystemHealth() {
    const startTime = Date.now();

    // Ping all dependencies in parallel
    const [postgres, qdrant, redis, openai, documentQueue] = await Promise.all([
      this.checkPostgres(),
      this.checkQdrant(),
      this.checkRedis(),
      this.checkOpenAI(),
      this.checkDocumentQueue(),
    ]);

    const services = { postgres, qdrant, redis, openai };
    const allHealthy = Object.values(services).every((s) => s.status === 'connected');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      responseMs: Date.now() - startTime,
      services,
      documentQueue,
    };
  }

  private async checkPostgres(): Promise<{ status: string; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'connected', latencyMs: Date.now() - start };
    } catch (error) {
      return { status: 'disconnected', latencyMs: Date.now() - start, error: String(error) };
    }
  }

  private async checkQdrant(): Promise<{
    status: string;
    latencyMs: number;
    collections?: number;
    totalPoints?: number;
    error?: string;
  }> {
    const start = Date.now();
    const qdrantUrl = this.config.get<string>('QDRANT_URL') || 'http://localhost:6333';
    try {
      const response = await fetch(`${qdrantUrl}/collections`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as {
        result: { collections: Array<{ name: string; points_count?: number }> };
      };
      const collections = data.result.collections;

      // Get total points from corpus_vectors if it exists
      const corpusCollection = collections.find((c) => c.name === 'corpus_vectors');
      let totalPoints = 0;
      if (corpusCollection) {
        try {
          const infoRes = await fetch(`${qdrantUrl}/collections/corpus_vectors`, {
            signal: AbortSignal.timeout(3000),
          });
          if (infoRes.ok) {
            const info = (await infoRes.json()) as {
              result: { points_count: number };
            };
            totalPoints = info.result.points_count;
          }
        } catch {
          // Ignore — we already know Qdrant is up
        }
      }

      return {
        status: 'connected',
        latencyMs: Date.now() - start,
        collections: collections.length,
        totalPoints,
      };
    } catch (error) {
      return { status: 'disconnected', latencyMs: Date.now() - start, error: String(error) };
    }
  }

  private async checkRedis(): Promise<{ status: string; latencyMs: number; error?: string }> {
    const start = Date.now();
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      return { status: 'not_configured', latencyMs: 0 };
    }
    try {
      const Redis = (await import('ioredis')).default;
      const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true,
      });
      client.on('error', () => {});
      await client.connect();
      const result = await client.ping();
      await client.disconnect();
      return { status: result === 'PONG' ? 'connected' : 'error', latencyMs: Date.now() - start };
    } catch (error) {
      return { status: 'disconnected', latencyMs: Date.now() - start, error: String(error) };
    }
  }

  private async checkOpenAI(): Promise<{ status: string; latencyMs: number; error?: string }> {
    const start = Date.now();
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey || apiKey === 'sk-change-me') {
      return { status: 'not_configured', latencyMs: 0 };
    }
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return {
        status: response.ok ? 'connected' : 'auth_error',
        latencyMs: Date.now() - start,
        ...(response.ok ? {} : { error: `HTTP ${response.status}` }),
      };
    } catch (error) {
      return { status: 'unreachable', latencyMs: Date.now() - start, error: String(error) };
    }
  }

  private async checkDocumentQueue() {
    const [failed, pending, processing] = await Promise.all([
      prisma.document.count({ where: { status: 'FAILED' } }),
      prisma.document.count({ where: { status: 'PENDING' } }),
      prisma.document.count({ where: { status: 'PROCESSING' } }),
    ]);
    return { failed, pending, processing };
  }

  // ---------------------------------------------------------------------------
  // Test status — runs test suites and parses results
  // ---------------------------------------------------------------------------

  private testCache: { data: unknown; expiresAt: number } | null = null;
  private static readonly TEST_CACHE_TTL = 60_000; // 1 minute

  async getTestStatus() {
    // Cache to avoid running tests on every request
    if (this.testCache && Date.now() < this.testCache.expiresAt) {
      return this.testCache.data;
    }

    const { execSync } = await import('child_process');
    const rootDir = process.cwd().replace(/\/apps\/api$/, '');

    const suites = [
      { name: 'API', command: 'pnpm --filter @corpusai/api test -- --reporter=json' },
      { name: 'Corpus', command: 'pnpm --filter @corpusai/corpus test -- --reporter=json' },
    ];

    const results = await Promise.all(
      suites.map(async (suite) => {
        try {
          const output = execSync(suite.command, {
            cwd: rootDir,
            timeout: 60_000,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_ENV: 'test' },
          });

          const json = this.parseVitestJson(output);
          return {
            name: suite.name,
            status: json.numFailedTests === 0 ? 'passed' : 'failed',
            tests: json.numTotalTests,
            passed: json.numPassedTests,
            failed: json.numFailedTests,
            files: json.numTotalTestSuites,
            durationMs: json.durationMs,
          };
        } catch (error) {
          // Tests failed — parse output from stderr/stdout
          const errOutput =
            error instanceof Error ? (error as { stdout?: string }).stdout || '' : '';
          const json = this.parseVitestJson(errOutput);

          if (json.numTotalTests > 0) {
            return {
              name: suite.name,
              status: 'failed',
              tests: json.numTotalTests,
              passed: json.numPassedTests,
              failed: json.numFailedTests,
              files: json.numTotalTestSuites,
              durationMs: json.durationMs,
            };
          }

          return {
            name: suite.name,
            status: 'error',
            tests: 0,
            passed: 0,
            failed: 0,
            files: 0,
            durationMs: 0,
            error: error instanceof Error ? error.message.slice(0, 200) : 'Unknown error',
          };
        }
      })
    );

    const totalTests = results.reduce((s, r) => s + r.tests, 0);
    const totalPassed = results.reduce((s, r) => s + r.passed, 0);
    const totalFailed = results.reduce((s, r) => s + r.failed, 0);
    const allPassed = results.every((r) => r.status === 'passed');

    const data = {
      status: allPassed ? 'all_passed' : 'some_failed',
      totalTests,
      totalPassed,
      totalFailed,
      suites: results,
      timestamp: new Date().toISOString(),
    };

    this.testCache = { data, expiresAt: Date.now() + AdminService.TEST_CACHE_TTL };
    return data;
  }

  private parseVitestJson(output: string): {
    numTotalTests: number;
    numPassedTests: number;
    numFailedTests: number;
    numTotalTestSuites: number;
    durationMs: number;
  } {
    try {
      // Vitest JSON reporter outputs a JSON object
      const jsonMatch = output.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          numTotalTests?: number;
          numPassedTests?: number;
          numFailedTests?: number;
          numTotalTestSuites?: number;
          startTime?: number;
          testResults?: unknown[];
        };
        return {
          numTotalTests: parsed.numTotalTests ?? 0,
          numPassedTests: parsed.numPassedTests ?? 0,
          numFailedTests: parsed.numFailedTests ?? 0,
          numTotalTestSuites: parsed.numTotalTestSuites ?? 0,
          durationMs: 0,
        };
      }
    } catch {
      // Fall through to regex parsing
    }

    // Fallback: parse from vitest summary output
    const testsMatch = /(\d+) passed.*?(\d+) failed|(\d+) passed/m.exec(output);
    const filesMatch = /Test Files\s+(?:\d+ failed \| )?(\d+) passed/m.exec(output);
    const totalMatch = /Tests\s+(?:(\d+) failed \| )?(\d+) passed/m.exec(output);

    const passed = parseInt(totalMatch?.[2] || testsMatch?.[1] || testsMatch?.[3] || '0', 10);
    const failed = parseInt(totalMatch?.[1] || testsMatch?.[2] || '0', 10);

    return {
      numTotalTests: passed + failed,
      numPassedTests: passed,
      numFailedTests: failed,
      numTotalTestSuites: parseInt(filesMatch?.[1] || '0', 10),
      durationMs: 0,
    };
  }
}
