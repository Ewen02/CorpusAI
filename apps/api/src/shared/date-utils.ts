/**
 * Shared date utilities for analytics queries.
 */

export type AnalyticsPeriod = '24h' | '7d' | '30d' | '90d';

/**
 * Returns the start date for a given analytics period, truncated to midnight UTC.
 * For '24h', returns 24 hours ago (not truncated to midnight).
 */
export function getStartDateForPeriod(period: AnalyticsPeriod): Date {
  if (period === '24h') {
    return new Date(Date.now() - 86_400_000);
  }
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  return startDate;
}

/**
 * Returns the number of days for a given analytics period.
 */
export function getDaysForPeriod(period: AnalyticsPeriod): number {
  if (period === '24h') return 1;
  return period === '7d' ? 7 : period === '90d' ? 90 : 30;
}
