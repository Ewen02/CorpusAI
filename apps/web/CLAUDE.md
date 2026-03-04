# apps/web — Next.js 15 Frontend

## Stack
- Next.js 15 (App Router), React 19, TypeScript strict
- Tailwind CSS, composants depuis `@corpusai/ui`
- React Query (`@tanstack/react-query`) pour le data fetching
- Better Auth pour l'authentification
- Recharts pour les graphiques

## Routes

```
src/app/
├── page.tsx                              # Landing page marketing
├── (auth)/sign-in, sign-up              # Pages auth
├── onboarding/                          # Post-inscription
├── (dashboard)/
│   ├── dashboard/                       # Overview + stats
│   ├── ais/                             # Liste AIs
│   ├── ais/new/                         # Creation AI (wizard 3 tabs)
│   ├── ais/[id]/                        # Detail AI (tabs: chat, docs, conversations, analytics, debug)
│   ├── ais/[id]/settings/               # Config AI (4 tabs)
│   ├── analytics/                       # Dashboard analytics global (Recharts)
│   ├── settings/                        # Profil utilisateur
│   ├── settings/billing/                # Abonnement
│   ├── settings/security/               # Securite
│   └── settings/notifications/          # Notifications
├── api/rag/[aiId]/debug-query/          # Next.js API route (proxy RAG debug)
└── embed/[slug]/                        # Widget chat embeddable (iframe)
```

## Data Fetching

Utiliser les hooks React Query depuis `src/lib/queries/` :

```typescript
// Hooks disponibles
import { useAIs, useAI, useCreateAI, useUpdateAI, useDeleteAI } from "@/lib/queries/use-ai";
import { useDocuments, useUploadFiles, useDeleteDocument, useRetryDocument } from "@/lib/queries/use-documents";
import { useConversations, useStartConversation } from "@/lib/queries/use-conversations";
import { useMessages } from "@/lib/queries/use-messages";
import { useDashboardStats } from "@/lib/queries/use-dashboard";
import { useAnalytics } from "@/lib/queries/use-analytics";
```

- Query key factory pattern : `aiKeys.detail(id)`, `aiKeys.lists()`
- Invalider les queries apres mutations : `queryClient.invalidateQueries()`
- Config QueryClient : staleTime=60s, retry=1, refetchOnWindowFocus=false

## API Client

`src/lib/api-client.ts` wrape fetch avec credentials et gestion d'erreurs :

```typescript
import { apiClient } from "@/lib/api-client";

// GET
const data = await apiClient.get<AIData[]>("/ais");
// POST
const ai = await apiClient.post<AIData>("/ais", body);
// PATCH
await apiClient.patch(`/ais/${id}`, body);
// DELETE
await apiClient.delete(`/ais/${id}`);
// SSE streaming
apiClient.streamMessage(conversationId, content, { onToken, onSources, onDone, onError });
```

## Authentication

- Client : `authClient` depuis `src/lib/auth-client.ts` (Better Auth React)
- Hook session : `authClient.useSession()`
- Sign-in : `authClient.signIn.email({ email, password })`
- Sign-out : `authClient.signOut()` puis redirect `/sign-in`
- Middleware : `src/middleware.ts` protege les routes dashboard/settings/ais/onboarding

## Composants UI

**TOUJOURS importer depuis `@corpusai/ui`**, jamais de chemins relatifs vers packages/ui :

```typescript
import { Button, Card, Input, Skeleton, Badge, Tabs } from "@corpusai/ui";
```

Composants locaux dans `src/components/` : ai-card, empty-states, skeletons, form-alert.

## Loading States

- Skeleton components dans `src/components/skeletons/`
- Chaque page majeure a son skeleton dedie (ais-page-skeleton, dashboard-skeleton...)

## Streaming Chat

```typescript
const { sendMessage, isStreaming } = useChatState(conversationId);
// Le hook gere : optimistic updates, streaming SSE, sources, confidence
```

## Fichiers cles

| Fichier | Role |
|---------|------|
| `src/lib/api-client.ts` | Fetch wrapper type avec SSE streaming |
| `src/lib/auth-client.ts` | Client Better Auth |
| `src/lib/queries/` | Hooks React Query (use-ai, use-documents, etc.) |
| `src/lib/query-client.ts` | QueryClient factory (server/browser) |
| `src/components/` | Composants partages (skeletons, cards...) |
| `src/app/(dashboard)/layout.tsx` | Layout dashboard avec sidebar |

## Checklist qualite

- [ ] TypeScript strict, pas de `any`
- [ ] Composants responsive (mobile-first)
- [ ] Loading states avec Skeleton
- [ ] Imports depuis `@corpusai/ui` (pas de chemins relatifs)
- [ ] React Query hooks, pas de raw fetch dans les composants
- [ ] Invalider les queries apres mutations
