Create a new React Query hook for: $ARGUMENTS

Steps:

1. Determine if this is a query (GET) or mutation (POST/PATCH/DELETE)
2. Add the hook to the appropriate file in `apps/web/src/lib/queries/`
3. Follow the existing pattern:
   - Query key factory pattern (see `aiKeys` in `use-ai.ts`)
   - `useQuery` for GET operations with proper `enabled` flag
   - `useMutation` for write operations with `queryClient.invalidateQueries()` on success
4. Use `apiClient` from `src/lib/api-client.ts` for the fetch call
5. Type the response using types from `@corpusai/types`
6. Export from `apps/web/src/lib/queries/index.ts` if barrel export exists

Reference: `apps/web/src/lib/queries/use-ai.ts` for the complete pattern.
