Create a new dashboard page at the route `$ARGUMENTS`.

Steps:

1. Create `apps/web/src/app/(dashboard)/$ARGUMENTS/page.tsx`
2. Add `"use client"` if the page requires interactivity
3. Import components from `@corpusai/ui` (never relative imports to packages/ui)
4. Create a loading skeleton component if the page fetches data
5. Use React Query hooks from `src/lib/queries/` for data fetching (create new hooks if needed)
6. Handle loading, error, and empty states
7. Use `apiClient` from `src/lib/api-client.ts` for API calls

Reference: `apps/web/src/app/(dashboard)/ais/page.tsx` for the complete pattern.
