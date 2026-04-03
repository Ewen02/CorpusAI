---
name: frontend-component
description: Crée pages, composants, hooks React Query dans apps/web/ ou packages/ui/. Triggers : "nouvelle page", "composant", "hook", "React Query", "dashboard", "formulaire", "frontend".
---

Stack : Next.js 15 App Router, React 19, TypeScript strict, React Query v5, Tailwind, shadcn/ui, @corpusai/ui.

## Règles critiques

- Import TOUJOURS depuis @corpusai/ui — jamais de chemins relatifs vers packages/ui
- "use client" uniquement si : useState, useEffect, event handlers, React Query
- Server Component par défaut (pas de "use client")
- Images : next/image obligatoire, jamais unoptimized={true}
- Toujours skeleton loading + état erreur

## React Query pattern

```typescript
export const aiKeys = {
  all: ['ais'] as const,
  list: () => [...aiKeys.all, 'list'] as const,
  detail: (id: string) => [...aiKeys.all, id] as const,
};

export function useAIs() {
  return useQuery({
    queryKey: aiKeys.list(),
    queryFn: () => apiClient.get<AIData[]>('/ais'),
    staleTime: 5 * 60 * 1000,
  });
}
```

## API client

```typescript
import { apiClient } from '@/lib/api-client';
apiClient.get<T>('/endpoint');
apiClient.post<T>('/endpoint', body);
apiClient.patch('/endpoint', body);
apiClient.delete('/endpoint');
apiClient.upload<T>('/endpoint', formData);
```

## Checklist

- [ ] Import depuis @corpusai/ui uniquement
- [ ] "use client" justifié
- [ ] Loading skeleton présent
- [ ] staleTime défini sur useQuery
- [ ] Mutations invalident les queries concernées

Hooks existants : use-ai, use-document, use-conversation, use-profile, use-analytics, use-eval, use-explore
Référence : apps/web/src/app/(dashboard)/ais/page.tsx
