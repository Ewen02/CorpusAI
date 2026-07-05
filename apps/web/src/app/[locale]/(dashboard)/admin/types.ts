// Monitoring response shapes live with their query hooks in the queries layer.
// Re-exported here so route-local components keep importing from `../types`.
export type { ServiceStatus, HealthData, TestSuite, TestStatus } from '@/lib/queries/use-admin';
