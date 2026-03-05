import { vi } from 'vitest';

/**
 * Creates a deeply-mocked Prisma client for unit tests.
 * Each model method returns undefined by default; override with mockResolvedValue in tests.
 */
export function createMockPrisma() {
  const modelMethods = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  });

  return {
    user: modelMethods(),
    aI: modelMethods(),
    document: modelMethods(),
    conversation: modelMethods(),
    message: modelMethods(),
    account: modelMethods(),
    endUser: modelMethods(),
    dailyStats: modelMethods(),
    $transaction: vi.fn((arg: unknown) => {
      if (typeof arg === 'function') {
        // For callback-style transactions, pass the mock prisma itself
        return (arg as (tx: unknown) => unknown)(createMockPrisma());
      }
      // For array-style transactions
      return Promise.resolve(arg);
    }),
  };
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;
