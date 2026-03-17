import { PrismaClient } from '@prisma/client';

const SOFT_DELETE_MODELS = ['User', 'AI'];

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Soft delete middleware: auto-filter deletedAt on read operations
  client.$use(async (params, next) => {
    if (params.model && SOFT_DELETE_MODELS.includes(params.model)) {
      // Override delete to soft delete
      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
        return next(params);
      }

      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        if (params.args.data) {
          params.args.data.deletedAt = new Date();
        } else {
          params.args.data = { deletedAt: new Date() };
        }
        return next(params);
      }

      // Auto-filter reads to exclude soft-deleted records
      if (
        ['findFirst', 'findMany', 'findUnique', 'count', 'aggregate', 'groupBy'].includes(
          params.action
        )
      ) {
        if (params.args.where) {
          // Don't override if deletedAt is explicitly set in the query
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        } else {
          params.args.where = { deletedAt: null };
        }
      }
    }

    return next(params);
  });

  return client;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient };
