import { Injectable } from '@nestjs/common';
import { prisma } from '@corpusai/database';

const DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class AdminService {
  private dashboardCache: { data: unknown; expiresAt: number } | null = null;

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

    const result = {
      totals: {
        users: userCount,
        ais: aiCount,
        documents: documentCount,
        conversations: conversationCount,
        messages: messageCount,
      },
      usersByPlan: usersByPlan.map((g) => ({
        plan: g.subscriptionPlan,
        count: g._count,
      })),
      documentsByStatus: documentsByStatus.map((g) => ({
        status: g.status,
        count: g._count,
      })),
      recentSignups,
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
          role: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          createdAt: true,
          _count: {
            select: { ais: true },
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
          documentCount: true,
          conversationCount: true,
          questionCount: true,
          createdAt: true,
          user: {
            select: { email: true, name: true },
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
    // Basic health metrics
    const [failedDocuments, pendingDocuments, processingDocuments] = await Promise.all([
      prisma.document.count({ where: { status: 'FAILED' } }),
      prisma.document.count({ where: { status: 'PENDING' } }),
      prisma.document.count({ where: { status: 'PROCESSING' } }),
    ]);

    return {
      documentQueue: {
        failed: failedDocuments,
        pending: pendingDocuments,
        processing: processingDocuments,
      },
    };
  }
}
