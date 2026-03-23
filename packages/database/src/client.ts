import { PrismaClient } from '@prisma/client';

function addDeletedAtFilter(where: any = {}): any {
  if (where.deletedAt === undefined) {
    return { ...where, deletedAt: null };
  }
  return where;
}

function softDeleteQueries(base: PrismaClient, modelName: string) {
  return {
    async findMany({ args, query }: { args: any; query: any }) {
      args.where = addDeletedAtFilter(args.where);
      return query(args);
    },
    async findFirst({ args, query }: { args: any; query: any }) {
      args.where = addDeletedAtFilter(args.where);
      return query(args);
    },
    async findUnique({ args, query }: { args: any; query: any }) {
      args.where = addDeletedAtFilter(args.where);
      return query(args);
    },
    async count({ args, query }: { args: any; query: any }) {
      args.where = addDeletedAtFilter(args.where);
      return query(args);
    },
    async delete({ args }: { args: any; query: any }) {
      return (base as any)[modelName].update({
        ...args,
        data: { deletedAt: new Date() },
      });
    },
    async deleteMany({ args }: { args: any; query: any }) {
      return (base as any)[modelName].updateMany({
        ...args,
        data: { deletedAt: new Date() },
      });
    },
  };
}

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return base.$extends({
    query: {
      user: softDeleteQueries(base, 'user'),
      aI: softDeleteQueries(base, 'aI'),
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

// Transaction client type for use in $transaction callbacks
export type TransactionClient = Parameters<Parameters<ExtendedPrismaClient['$transaction']>[0]>[0];

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type { ExtendedPrismaClient as PrismaClient };
