import type { AnalyticsPeriod } from '@/lib/queries';

/**
 * `labelKey` maps to the `analytics.periods.*` i18n namespace — translate at the
 * call site with `useTranslations('analytics.periods')`.
 */
export const PERIOD_OPTIONS: { value: AnalyticsPeriod; labelKey: AnalyticsPeriod }[] = [
  { value: '24h', labelKey: '24h' },
  { value: '7d', labelKey: '7d' },
  { value: '30d', labelKey: '30d' },
  { value: '90d', labelKey: '90d' },
];
