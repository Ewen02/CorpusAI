Run tests for: $ARGUMENTS

If no argument provided, run all available tests.

Package-specific commands:
- `corpus`: `pnpm --filter @corpusai/corpus test`
- `corpus:coverage`: `pnpm --filter @corpusai/corpus test:coverage`
- `api`: `pnpm --filter @corpusai/api test` (if tests exist)
- `web`: `pnpm --filter @corpusai/web test` (if tests exist)
- `all`: `pnpm test`

After running, report:
- Number of tests passed/failed/skipped
- Details of any failing tests
- Suggestions for fixing failures if applicable
