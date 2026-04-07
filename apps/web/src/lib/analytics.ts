import posthog from 'posthog-js';

/**
 * Centralized analytics wrapper.
 *
 * Every custom event in the app MUST go through `track(...)` from this file
 * instead of importing from `posthog-js` directly. This gives us:
 *
 * 1. Type-safe autocomplete on event names + payloads (one place to look)
 * 2. A single chokepoint to enforce "no PII in events" (no email, no user id,
 *    no message content — only aggregable metadata)
 * 3. Safe no-op in dev / SSR / when PostHog isn't loaded
 *
 * Funnel stages covered:
 * - Acquisition: landing, signup, signin
 * - Activation: ai_creation, document_indexed, first_chat_message_sent
 * - Engagement: chat_message_sent, public_chat, widget, share
 * - Monetization: pricing, upgrade_clicked, checkout
 * - Friction: rate_limit_hit, document_upload_failed, plan_limit_reached, feedback
 */

type SocialProvider = 'google' | 'github';
type AuthMethod = 'email' | SocialProvider;
type ChatSource = 'dashboard' | 'public' | 'widget';
type SubscriptionPlan = 'FREE' | 'CREATOR' | 'PRO' | 'ENTERPRISE';
type BillingPeriod = 'monthly' | 'yearly';
type PlanLimit = 'ai' | 'document' | 'questions_per_day' | 'end_users';
type FeedbackValue = 'positive' | 'negative';

export type AnalyticsEvent =
  // ── Acquisition ────────────────────────────────────────────
  | { name: 'landing_viewed'; data?: Record<string, never> }
  | { name: 'signup_started'; data: { method: AuthMethod } }
  | { name: 'signup_completed'; data: { method: AuthMethod } }
  | { name: 'signin_started'; data: { method: AuthMethod } }
  | { name: 'signin_completed'; data: { method: AuthMethod } }

  // ── Activation ─────────────────────────────────────────────
  | { name: 'ai_creation_started'; data?: Record<string, never> }
  | { name: 'ai_template_selected'; data: { template: string } }
  | { name: 'ai_created'; data: { category: string; hasTemplate: boolean } }
  | { name: 'document_upload_started'; data: { fileCount: number; totalSizeMb: number } }
  | { name: 'document_indexed'; data: { mimeType: string; sizeMb: number } }
  | { name: 'first_chat_message_sent'; data: { source: ChatSource } }

  // ── Engagement ─────────────────────────────────────────────
  | { name: 'chat_message_sent'; data: { source: ChatSource; aiId: string } }
  | { name: 'public_chat_opened'; data: { aiSlug: string } }
  | { name: 'widget_chat_opened'; data: { aiSlug: string } }
  | { name: 'ai_shared'; data: { method: 'link' | 'embed_iframe' | 'embed_script' } }
  | { name: 'conversation_deleted'; data?: Record<string, never> }

  // ── Monetization ──────────────────────────────────────────
  | { name: 'pricing_viewed'; data?: Record<string, never> }
  | { name: 'upgrade_clicked'; data: { fromPlan: SubscriptionPlan; toPlan: SubscriptionPlan } }
  | { name: 'checkout_started'; data: { plan: SubscriptionPlan; period: BillingPeriod } }
  | { name: 'billing_portal_opened'; data?: Record<string, never> }
  | { name: 'subscription_upgraded'; data: { plan: SubscriptionPlan } }

  // ── Friction / Retention ──────────────────────────────────
  | { name: 'rate_limit_hit'; data: { endpoint: string } }
  | { name: 'document_upload_failed'; data: { reason: string } }
  | { name: 'plan_limit_reached'; data: { limit: PlanLimit; plan: SubscriptionPlan } }
  | { name: 'feedback_submitted'; data: { value: FeedbackValue } };

type EventName = AnalyticsEvent['name'];
type EventData<N extends EventName> = Extract<AnalyticsEvent, { name: N }>['data'];

/**
 * Fire a custom analytics event. Type-safe: the event name constrains the
 * second argument to the matching payload shape.
 *
 * Example:
 *   track('ai_created', { category: 'LEGAL', hasTemplate: true });
 */
export function track<N extends EventName>(
  name: N,
  ...args: EventData<N> extends Record<string, never> | undefined
    ? [data?: EventData<N>]
    : [data: EventData<N>]
): void {
  const [data] = args;
  // Guard: posthog-js is only initialized in the browser when the public key
  // env var is set. On SSR / dev / misconfig it's a safe no-op.
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(name, (data ?? {}) as Record<string, unknown>);
  } catch {
    // Never let analytics break the app.
  }
}
