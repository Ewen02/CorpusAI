export const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

export const TEST_PASSWORD = 'Test1234!';

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;
}

export function uniqueAIName(): string {
  return `E2E AI ${Date.now().toString(36)}`;
}
