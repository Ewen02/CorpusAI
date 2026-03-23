/**
 * DailyStats increment utility for tracking analytics.
 * Called inside Prisma transactions alongside counter updates.
 */

import type { TransactionClient } from '@corpusai/database';

type StatsField = 'documentCount' | 'conversationCount' | 'questionCount';

type TxClient = TransactionClient;

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
  // updateMany is safe with nullable aiId and requires no unique field.
  // It atomically increments if the row exists.
  const updated = await tx.dailyStats.updateMany({
    where: { userId, aiId, date },
    data: { [field]: { increment } },
  });

  if (updated.count === 0) {
    // Row doesn't exist yet — create it, catching P2002 for concurrent inserts
    // on the same (userId, aiId, date) from parallel requests.
    try {
      await tx.dailyStats.create({
        data: { userId, aiId, date, [field]: increment },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        // Another request created the row concurrently — retry the update.
        await tx.dailyStats.updateMany({
          where: { userId, aiId, date },
          data: { [field]: { increment } },
        });
      } else {
        throw error;
      }
    }
  }
}
