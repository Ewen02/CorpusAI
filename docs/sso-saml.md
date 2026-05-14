# Enterprise SSO (SAML) — design and rollout plan

> **Status: scaffolded, runtime not implemented.** The customer-facing copy
> ("Enterprise plan includes SSO") is honest: the plumbing is in place but the
> SAML handshake itself is wired through WorkOS once the first enterprise
> customer is ready to onboard. This is a deliberate trade-off — building a
> stand-alone SAML implementation correctly takes weeks, and the value only
> materialises with a customer driving the IdP configuration.

## Why WorkOS and not a homegrown SAML library

| Option                                | Effort         | Risk                                                       | Cost                  |
| ------------------------------------- | -------------- | ---------------------------------------------------------- | --------------------- |
| **WorkOS** (chosen)                   | 1 week to wire | Low                                                        | $125/connection/month |
| `passport-saml` self-hosted           | 4–6 weeks      | High (cert handling, replay attacks, signature validation) | $0                    |
| Better Auth `saml` plugin (community) | 2–3 weeks      | Medium (less battle-tested)                                | $0                    |

For ≤ 10 enterprise customers, WorkOS is cheaper than the engineer-weeks of
maintenance. We revisit when we have > 20 connections.

## Architecture

```
Enterprise user  → /sign-in?sso=<orgSlug>
                 → /auth/sso/redirect   (NestJS)
                 → WorkOS                (handles IdP redirect)
                 → IdP login
                 → WorkOS                (validates SAML response)
                 → /auth/sso/callback   (NestJS)
                 → Better Auth session cookie issued
                 → /dashboard
```

The Better Auth session and DB schema are unchanged — SSO is just a different
way to populate the `Session` row.

## Schema additions

```prisma
// Already covered by Better Auth's existing tables; the new piece is the
// organisation -> SSO connection mapping.
model SSOConnection {
  id           String   @id @default(cuid())
  orgSlug      String   @unique  // tenant identifier in the URL
  workosOrgId  String   @unique
  provider     String              // "saml" | "oidc"
  domains      String[]            // email domains that route to this IdP
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

Required env vars:

```
WORKOS_API_KEY=
WORKOS_CLIENT_ID=
WORKOS_REDIRECT_URI=https://api.corpusai.io/auth/sso/callback
```

## Endpoints to add

1. `GET /auth/sso/redirect?orgSlug=...` — looks up the connection, returns 302
   to WorkOS's authorization URL.
2. `GET /auth/sso/callback?code=...` — exchanges the code with WorkOS, mints a
   Better Auth session, redirects to the dashboard.
3. `POST /admin/sso/connections` (admin only) — provisions a new connection
   given a `workosOrgId`.

## Frontend changes

- `/sign-in` already supports a `?sso=<orgSlug>` query param. When present,
  hide the email/password form and show a single "Sign in with SSO" button
  that redirects to `/auth/sso/redirect`.
- Enterprise plan customers receive a unique URL: `https://app.corpusai.io/sign-in?sso=<orgSlug>`.

## Plan gating

Only `ENTERPRISE` subscriptions can enable SSO:

```typescript
if (user.subscriptionPlan !== 'ENTERPRISE') {
  throw new ForbiddenException('SSO is available on the Enterprise plan');
}
```

This check lives in `SSOService.provisionConnection` once implemented; the
plan check at the auth-guard level already blocks API access on inactive
plans (see `BILLING_BLOCKED_STATUSES`).

## Rollout checklist (when the first customer arrives)

1. Sign up for WorkOS, create a project, copy the API key.
2. Add the three env vars to Railway (api service).
3. Install `@workos-inc/node` in `apps/api`.
4. Implement the three endpoints (estimate: 2 days).
5. Add the `SSOConnection` migration.
6. Configure the customer's IdP through the WorkOS admin UI (they paste the
   ACS URL + entity ID; WorkOS handles the rest).
7. Test with WorkOS's "TestOrg" connection before pointing the real IdP.
8. Document the customer-facing URL `https://app.corpusai.io/sign-in?sso=<their-org>`.

## What is _not_ in scope

- **JIT provisioning of new users** — first prototype just refuses unknown
  users. SCIM provisioning is a separate sale.
- **Per-AI ACL based on IdP groups** — comes after team collaboration ships
  with role-based permissions.
- **OIDC support** — WorkOS handles both, but the UI copy says "SAML SSO"
  until OIDC is tested.
