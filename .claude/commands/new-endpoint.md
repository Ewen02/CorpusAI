Add a new endpoint to an existing NestJS module in `apps/api/src/modules/`.

Usage: `/new-endpoint <module> <HTTP_METHOD> <route> [description]`

Example: `/new-endpoint ais PATCH :id/archive Archive an AI`

---

## Steps

1. Read the existing module files:
   - `apps/api/src/modules/$MODULE/$MODULE.controller.ts`
   - `apps/api/src/modules/$MODULE/$MODULE.service.ts`
   - `apps/api/src/modules/$MODULE/dto/` directory

2. Determine what DTO is needed:
   - GET endpoints with params: no DTO needed, use `@Param()`
   - POST/PATCH with body: create a new DTO in `dto/`
   - Simple actions (archive, publish, toggle): may not need a body DTO

3. Add the **service method** first:
   - Use `prisma` with `select` to limit fields
   - Call `getOwnedAI()` or appropriate ownership check from `shared/ownership.ts`
   - Use NestJS exceptions: `NotFoundException`, `ForbiddenException`, `BadRequestException`
   - Wrap multi-step writes in `prisma.$transaction()`

4. Add the **controller method**:
   - Correct HTTP decorator: `@Get`, `@Post`, `@Patch`, `@Delete`, `@Put`
   - `@UseGuards(AuthGuard)` if not already on the class
   - `@CurrentUser() user: CurrentUserData` if auth needed
   - Full Swagger decorators:
     ```typescript
     @Patch(':id/archive')
     @ApiOperation({ summary: 'Archive an AI' })
     @ApiParam({ name: 'id', description: 'AI ID' })
     @ApiResponse({ status: 200, description: 'AI archived' })
     @ApiResponse({ status: 404, description: 'AI not found' })
     @ApiResponse({ status: 403, description: 'Access denied' })
     ```

5. If a new DTO was created, export it from `index.ts`

6. Run `pnpm typecheck` to verify no TypeScript errors

---

## Rules

- NEVER skip Swagger documentation
- ALWAYS verify ownership before modifying a resource
- ALWAYS use `select` on Prisma queries
- Follow the exact patterns in `apps/api/src/modules/ais/` as reference
