Modify the Prisma schema based on: $ARGUMENTS

Steps:

1. Edit `packages/database/prisma/schema.prisma`
2. Add appropriate indexes for common query patterns
3. Use cascade deletes for child relations (`onDelete: Cascade`)
4. If new enums are needed, add them to the schema
5. Update `packages/database/src/index.ts` to re-export new types/enums if needed
6. Update `packages/types/src/` if the new model needs shared API types
7. Run: `pnpm --filter @corpusai/database db:push`
8. Rebuild: `pnpm --filter @corpusai/database build`

Check existing models in the schema for naming conventions and patterns.
