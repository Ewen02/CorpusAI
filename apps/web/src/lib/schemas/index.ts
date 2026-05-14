/**
 * Centralised Zod schemas for client-side form validation.
 *
 * Server-side validation still happens via NestJS DTOs — these schemas are
 * a UX-first defense: they give immediate feedback before a request hits the API
 * and guarantee API calls carry well-shaped payloads.
 */
export * from './ai.schemas';
export * from './user.schemas';
