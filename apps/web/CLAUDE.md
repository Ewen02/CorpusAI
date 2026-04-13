# apps/web — Next.js 15 Frontend

## Stack

Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS, `@corpusai/ui`, React Query, Better Auth, Recharts.

## Routes

```
src/app/
├── page.tsx                   # Landing
├── (auth)/sign-in, sign-up    # Auth créateur
├── onboarding/                # Wizard post-inscription
├── (dashboard)/
│   ├── dashboard/             # Overview + stats
│   ├── ais/, ais/new/, ais/[id]/, ais/[id]/settings/
│   ├── analytics/             # Global analytics (Recharts)
│   └── settings/, settings/billing/, settings/security/, settings/notifications/
├── chat/[slug]/               # Chat public (?t=TOKEN, ?code=CODE)
├── embed/[slug]/              # Widget embeddable (iframe)
├── portal/                    # End-user: sign-in, auth/verify, conversations
└── api/rag/[aiId]/debug-query/
```

## Data Fetching

React Query hooks in `src/lib/queries/`: `use-ai`, `use-documents`, `use-conversations`, `use-messages`, `use-dashboard`, `use-analytics`, `use-ai-access`, `use-portal`.

Query key factory pattern. Invalidate queries after mutations. Config: staleTime=60s, retry=1.

## API Client

`src/lib/api-client.ts` — typed fetch wrapper with credentials, error handling, SSE streaming.

```typescript
import { apiClient } from '@/lib/api-client';
apiClient.get<T>(path) / .post<T>(path, body) / .patch(path, body) / .delete(path)
apiClient.streamMessage(conversationId, content, { onToken, onSources, onDone, onError })
```

## Authentication (2 independent systems)

### Creator (Better Auth)

- Client: `authClient` from `src/lib/auth-client.ts`
- Session: `authClient.useSession()`, sign-in/out methods
- Cookie: `better-auth.session_token`
- Middleware protects: `/dashboard`, `/ais`, `/settings`, `/onboarding`

### End-User (magic link + eu_session)

- Flow: `POST /portal/auth/magic-link` → email 15min → `GET /portal/auth/verify` → cookie `eu_session` 7d
- callbackUrl via `sessionStorage` before magic link → read on mount → redirect
- Middleware protects: `/portal/*` except `/portal/sign-in` and `/portal/auth`

## Public Chat (`usePublicChat` hook)

`src/lib/hooks/use-public-chat.ts` — handles access control:

- `accessDeniedReason: 'access_token' | 'access_code' | 'invite_only' | 'ai_inactive' | null`
- `invite_only` → button to `/portal/sign-in?callbackUrl=...&aiSlug=...`
- `access_code` → code input modal
- `access_token` → auto from URL `?t=TOKEN`

## Component Rules

| Where                 | When                                  |
| --------------------- | ------------------------------------- |
| `@corpusai/ui`        | Used in 2+ routes OR purely visual    |
| `src/components/`     | Web-specific, shared across routes    |
| `[route]/components/` | Route-specific (1 file = 1 component) |
| Inline                | < 15 lines, never reused              |

Always import from `@corpusai/ui`, never relative paths to packages/ui. Icons: always `lucide-react`.

## File Size & Extraction

- **Max 300 lines/file** — extract sub-components, hooks, helpers beyond that
- Sub-component > 50 lines → separate file in `components/`
- Hook > 30 lines → separate file in `hooks/`
- Constants/mappings → `constants.ts`, utilities → `utils.ts`
- 10+ `useState` → extract custom hook
- No raw `fetch` — use `apiClient` + React Query hooks

## Checklist

- [ ] TypeScript strict, no `any`
- [ ] Responsive (mobile-first), loading states with Skeleton
- [ ] Imports from `@corpusai/ui`, React Query hooks for data
- [ ] Invalidate queries after mutations
- [ ] Correct auth: `authClient` (creator) vs portal (end-user)
- [ ] `invite_only` in public chat → portal/sign-in button
- [ ] Files < 300 lines
