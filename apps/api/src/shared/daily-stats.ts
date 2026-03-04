/**
 * DailyStats increment utility for tracking analytics.
 * Called inside Prisma transactions alongside counter updates.
 */

import type { PrismaClient } from '@corpusai/database';

type StatsField = 'documentCount' | 'conversationCount' | 'questionCount';

// Prisma interactive transaction client (same API minus $transaction/$connect etc.)
type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Increments a DailyStats field for both per-AI and global (aiId=null) stats.
 * Uses findFirst + create/update pattern (safer than upsert with nullable compound unique).
 */
export async function incrementDailyStats(
  tx: TxClient,
  userId: string,
  aiId: string,
  field: StatsField,
  increment = 1
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Per-AI stats
  await upsertStats(tx, userId, aiId, today, field, increment);

  // Global stats (aiId = null)
  await upsertStats(tx, userId, null, today, field, increment);
}

async function upsertStats(
  tx: TxClient,
  userId: string,
  aiId: string | null,
  date: Date,
  field: StatsField,
  increment: number
): Promise<void> {
  const existing = await tx.dailyStats.findFirst({
    where: { userId, aiId, date },
    select: { id: true },
  });

  if (existing) {
    await tx.dailyStats.update({
      where: { id: existing.id },
      data: { [field]: { increment } },
    });
  } else {
    await tx.dailyStats.create({
      data: {
        userId,
        aiId,
        date,
        [field]: increment,
      },
    });
  }
}
