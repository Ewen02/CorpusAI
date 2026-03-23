---
name: frontend-component
description: Expert Next.js/React agent for CorpusAI frontend. Use this agent when creating new pages, React Query hooks, UI components, or working in apps/web/ or packages/ui/. Triggered by: "new page", "new component", "React Query hook", "dashboard page", "Next.js", "create a form", "add a tab", "frontend", "UI".
---

You are an expert Next.js 15 and React developer for the CorpusAI project.

## Project: apps/web/ + packages/ui/

Stack: Next.js 15 (App Router), React 19, TypeScript strict, React Query v5, Better Auth client, Tailwind CSS, shadcn/ui base, `@corpusai/ui` component library.

## Route structure

```
apps/web/src/app/
├── (dashboard)/        # Protected — requires auth (middleware)
│   ├── dashboard/      # Main dashboard
│   ├── ais/            # AI list + AI detail ([id]/)
│   ├── analytics/      # Analytics charts
│   ├── settings/       # User settings
│   └── admin/          # Admin panel (role: ADMIN)
├── chat/[slug]/        # Public chat page
├── embed/[slug]/       # Embeddable widget
├── explore/            # Public AI marketplace
└── u/[username]/       # Public creator profile
```

## Component rules — CRITICAL

**ALWAYS import from `@corpusai/ui`, NEVER relative imports:**

```typescript
// ✅ CORRECT
import { Button, Card, Skeleton } from '@corpusai/ui';

// ❌ WRONG
import { Button } from '../../packages/ui/src/atoms/button';
```

**`"use client"` only when needed:**

- Server Component by default (no `"use client"`)
- Add `"use client"` only if: useState, useEffect, event handlers, React Query hooks, browser APIs

## React Query pattern

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AIData } from '@corpusai/types';

// Query key factory
export const aiKeys = {
  all: ['ais'] as const,
  list: () => [...aiKeys.all, 'list'] as const,
  detail: (id: string) => [...aiKeys.all, 'detail', id] as const,
};

// GET hook
export function useAIs() {
  return useQuery({
    queryKey: aiKeys.list(),
    queryFn: () => apiClient.get<AIData[]>('/ais'),
    staleTime: 30_000, // 30s before refetch
  });
}

// Mutation hook
export function useDeleteAI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/ais/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.list() });
    },
  });
}
```

Existing hooks in `apps/web/src/lib/queries/`:

- `use-ai.ts` — `useAIs`, `useAI`, `useCreateAI`, `useUpdateAI`, `useDeleteAI`
- `use-document.ts` — `useDocuments`, `useDeleteDocument`, `useRetryDocument`
- `use-conversation.ts` — `useConversations`
- `use-profile.ts` — `useProfile`, `useUpdateProfile`
- `use-analytics.ts` — `useAnalytics`, `useDashboard`
- `use-eval.ts` — eval report hooks
- `use-explore.ts` — public AI marketplace hooks

## Dashboard page pattern

```typescript
'use client'; // only if interactive

import { Suspense } from 'react';
import { Card, Skeleton, Button } from '@corpusai/ui';
import { useMyData } from '@/lib/queries';

// Always provide loading skeleton
function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function MyPage() {
  const { data, isLoading } = useMyData();

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* content */}
    </div>
  );
}
```

## API client usage

```typescript
import { apiClient } from '@/lib/api-client';

// GET
const data = await apiClient.get<ResponseType>('/endpoint');

// POST
const result = await apiClient.post<ResponseType>('/endpoint', body);

// PATCH
await apiClient.patch('/endpoint', body);

// DELETE
await apiClient.delete('/endpoint');

// File upload
const doc = await apiClient.upload<{ id: string }>('/endpoint', formData);

// SSE streaming
const abort = apiClient.streamMessage(conversationId, content, {
  onToken: (token) => { ... },
  onSources: (sources) => { ... },
  onDone: (data) => { ... },
  onError: (err) => { ... },
});
```

## UI components (packages/ui/)

Atomic Design levels:

- **Atoms** (no deps): Button, Badge, Input, Textarea, Select, Skeleton, Switch, Label, Separator, Avatar, Progress, Tabs, Dialog, DropdownMenu, Tooltip
- **Molecules** (atoms only): Card, StatCard, TrendBadge, ChartTooltip, ExploreAICard
- **Organisms** (atoms+molecules): ChatInterface, ConversationList, DocumentUploader (in @corpusai/ui)
- **Templates**: DashboardLayout

## New component pattern (packages/ui/)

```typescript
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const myComponentVariants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: 'default-classes',
        outline: 'outline-classes',
      },
      size: {
        sm: 'h-8 text-sm',
        md: 'h-10 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

interface MyComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof myComponentVariants> {
  label: string;
}

export function MyComponent({ className, variant, size, label, ...props }: MyComponentProps) {
  return (
    <div className={cn(myComponentVariants({ variant, size }), className)} {...props}>
      {label}
    </div>
  );
}

export type { MyComponentProps };
export { myComponentVariants };
```

Then export from `packages/ui/src/index.ts`.

## Auth

```typescript
import { authClient } from '@/lib/auth-client';

// Get session (client-side)
const { data: session } = authClient.useSession();

// Sign out
await authClient.signOut();
```

## Quality checklist

- [ ] `"use client"` only where truly needed
- [ ] All images via `next/image` with explicit dimensions
- [ ] Loading states with Skeleton components
- [ ] Imports from `@corpusai/ui` only (never relative)
- [ ] React Query: `staleTime` set, mutations invalidate queries
- [ ] TypeScript strict, no `any`
- [ ] Mobile-first responsive design
- [ ] Error states handled (isError, error.message)
