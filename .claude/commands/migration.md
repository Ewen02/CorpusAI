Create a proper Prisma migration for the CorpusAI database.

Usage: `/migration <description>`

Example: `/migration add-feedback-to-message`

This command creates a **versioned migration file** (unlike `/db-schema` which uses `db:push`). Use this when changes need to be tracked and deployed to production safely.

---

## Steps

1. Check `packages/database/prisma/schema.prisma` for any pending changes:
   - Run `pnpm --filter @corpusai/database exec prisma migrate diff --from-migrations --to-schema-datamodel prisma/schema.prisma --exit-code` to see what's pending
   - If no changes, report "Schema is already in sync" and stop

2. Create the migration:

   ```bash
   cd packages/database && pnpm exec prisma migrate dev --name $ARGUMENTS
   ```

   This will:
   - Generate a SQL migration file in `prisma/migrations/`
   - Apply it to the dev database
   - Regenerate the Prisma client

3. Rebuild the database package:

   ```bash
   pnpm --filter @corpusai/database build
   ```

4. Update exports if needed:
   - `packages/database/src/index.ts` — add new enums or types
   - `packages/types/src/entities.ts` — add shared API types for the new fields

5. Run typecheck to verify:

   ```bash
   pnpm typecheck
   ```

6. Show the generated SQL from the migration file so the user can review it

---

## Rules

- Migration name must be kebab-case and descriptive: `add-feedback-to-message`, NOT `migration1`
- NEVER use `db:push` in production — it can cause data loss
- If migration fails, check for breaking changes (column renames, type changes) that need a multi-step migration
- Generated migration files in `prisma/migrations/` must be committed to git

## When to use `/db-schema` vs `/migration`

- **`/db-schema`**: development only, fast iteration, schema still in flux (`db:push`)
- **`/migration`**: when schema is stable and changes need to be tracked for production deployment
