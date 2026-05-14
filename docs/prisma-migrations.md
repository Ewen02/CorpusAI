# Prisma migrations playbook

Single source of truth for how we evolve the Postgres schema across
environments. The repo started with a single `init` migration and has been
adding one focused migration per change since (e.g. `add_enduser_expiry_indexes`,
`invalidate_plaintext_sessions`, `add_message_token_split_and_cost`).

## Rules

1. **One PR ⇒ one migration.** Bundling unrelated schema changes makes review
   harder and rollback impossible.
2. **Never edit an applied migration.** Once `pnpm db:migrate:prod` has run it
   in any environment, the file is immutable. To fix it, write a new migration.
3. **Migrations are forward-only.** We never run a "down" migration in
   production. If something needs to be reverted, write a _new_ migration that
   undoes the change explicitly.
4. **Backwards-compatible deploys.** A migration must work alongside _both_ the
   previous and the new app version (because deploys are not instantaneous).
   See "Compatibility matrix" below.
5. **No data loss without explicit sign-off.** `DROP COLUMN`, `DROP TABLE`,
   destructive `UPDATE`, and column-type narrowing always require a written
   green light from the engineer running the deploy.

## Workflow

### 1. Edit the schema

```bash
# Edit packages/database/prisma/schema.prisma
pnpm --filter @corpusai/database exec prisma format
```

### 2. Create the migration

Local Postgres running? Use Prisma's generator — it produces the SQL and
applies it to your dev DB in one step:

```bash
pnpm db:migrate dev --name <kebab-case-description>
```

No local Postgres (e.g. CI sandbox, ephemeral container)? Hand-write the SQL
file using the same naming convention as the existing migrations:

```bash
mkdir -p packages/database/prisma/migrations/$(date +%Y%m%d%H%M%S)_<name>
# ...edit migration.sql by hand, mirror what Prisma would have generated.
```

Either way the final file must be in
`packages/database/prisma/migrations/<timestamp>_<name>/migration.sql`.

### 3. Regenerate the client

```bash
pnpm --filter @corpusai/database exec prisma generate
```

### 4. Run typecheck + tests

```bash
pnpm typecheck
pnpm --filter @corpusai/api test
```

### 5. Commit

Conventional commit pattern:

```
feat(database): describe what the migration unlocks
```

Always include the migration directory + `schema.prisma` in the same commit.

## Compatibility matrix

| Change                                | Safe alone? | Pattern                                                                                                               |
| ------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Add a nullable column                 | ✅          | Single migration.                                                                                                     |
| Add a non-null column with a default  | ✅          | Single migration. Default is applied to existing rows.                                                                |
| Add a non-null column with no default | ⚠️          | Two-step deploy: (a) add nullable + backfill in app code, (b) follow-up migration sets NOT NULL.                      |
| Drop a column                         | ⚠️          | Two-step: (a) stop reading/writing it in app code, ship that release; (b) `DROP COLUMN` migration in a later release. |
| Rename a column                       | ⚠️          | Three-step: add new column, dual-write, swap reads, drop old.                                                         |
| Add a unique index on existing data   | ⚠️          | Check for duplicates first (`SELECT col, COUNT(*) ... HAVING COUNT(*) > 1`).                                          |
| Add a regular index                   | ✅          | Single migration. Use `CREATE INDEX CONCURRENTLY` (see below) for tables > 1 M rows in prod.                          |
| Backfill data                         | ✅          | Use plain `UPDATE` statements in the migration; keep them idempotent (`WHERE col IS NULL`).                           |
| Cascade delete from existing relation | ❌          | Almost always wrong — write a service-level cascade instead.                                                          |

## Large-table safety

For tables that already have millions of rows in production:

- **Indexes**: PostgreSQL holds an `ACCESS EXCLUSIVE` lock during `CREATE
INDEX`. Switch to:
  ```sql
  CREATE INDEX CONCURRENTLY IF NOT EXISTS "<idx_name>" ON "<table>" (...);
  ```
  Prisma doesn't emit `CONCURRENTLY` automatically — edit the generated SQL.
- **Backfills**: chunk the work to avoid long transactions:
  ```sql
  DO $$
  DECLARE batch_count int;
  BEGIN
    LOOP
      WITH cte AS (
        SELECT id FROM "Message" WHERE "cost" IS NULL LIMIT 10000
      )
      UPDATE "Message" SET "cost" = 0 FROM cte WHERE "Message".id = cte.id;
      GET DIAGNOSTICS batch_count = ROW_COUNT;
      EXIT WHEN batch_count = 0;
    END LOOP;
  END $$;
  ```

## CI checks

The `Test` job in `.github/workflows/ci.yml` runs `pnpm test:coverage` which
exercises every repository in unit tests. It does not spin up Postgres — schema
correctness is verified by `pnpm typecheck` (Prisma generates types from
`schema.prisma`).

Before merging a migration PR, manually verify:

1. `pnpm typecheck` is green.
2. `pnpm --filter @corpusai/database exec prisma format` produces no diff.
3. The migration SQL is readable and matches what `schema.prisma` declares.
4. If the change is non-trivial, run it against a staging clone first.

## Rollback playbook

A migration has shipped and broken prod. What now?

1. **Don't run `prisma migrate resolve --rolled-back`** unless you've also
   reverted the _application_ code that depends on the new schema. The DB and
   the app must stay in sync.
2. **Forward fix first.** 90% of the time you can write a follow-up migration
   that fixes the issue (drop a wrong index, rename back, restore a column).
3. **Restore from snapshot only as a last resort.** Railway, Hetzner Postgres,
   and most managed providers keep daily snapshots. Restoring loses every
   write between snapshot time and now — never the right answer for a
   pure-schema bug.

## History

| Migration                                         | Notes                                              |
| ------------------------------------------------- | -------------------------------------------------- |
| `20260304225422_init`                             | Baseline (everything before the audit).            |
| `20260514213500_enduser_expiry_indexes`           | Indexes for cleanup queries.                       |
| `20260514220000_invalidate_plaintext_sessions`    | Cleared rows that pre-dated SHA-256 token hashing. |
| `20260514230000_add_message_token_split_and_cost` | Cost analytics fields on `Message`.                |

Add a new row here whenever you ship a migration. One-line summary is enough.
