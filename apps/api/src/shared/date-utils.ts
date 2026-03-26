/**
 * Shared date utilities for analytics queries.
 */

/**
 * Returns the start date for a given analytics period, truncated to midnight UTC.
 */
export function getStartDateForPeriod(period: '7d' | '30d' | '90d'): Date {
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  return startDate;
}

/**
 * Returns the number of days for a given analytics period.
 */
export function getDaysForPeriod(period: '7d' | '30d' | '90d'): number {
  return period === '7d' ? 7 : period === '90d' ? 90 : 30;
}
