---
name: api-module
description: Crée ou modifie un module NestJS dans apps/api/. Triggers : "nouveau module", "nouvel endpoint", "controller", "service", "DTO", "NestJS", "guard".
---

Stack : NestJS 11, TypeScript strict, Prisma 6, Better Auth (cookies), BullMQ.

## Structure obligatoire

modules/<name>/
├── <name>.module.ts # Importer dans app.module.ts
├── <name>.controller.ts # @ApiTags + @UseGuards(AuthGuard) + @ApiBearerAuth()
├── <name>.service.ts # Business logic — prisma avec select
├── dto/create-<name>.dto.ts
└── index.ts # Barrel export

## Règles critiques

- Ownership TOUJOURS via shared/ownership.ts (getOwnedAI, verifyDocumentOwnership...)
- Prisma : JAMAIS select \* — toujours lister les champs
- Swagger : @ApiOperation + @ApiResponse sur chaque endpoint
- DTOs : class-validator + @ApiProperty obligatoires
- Erreurs : NotFoundException, ForbiddenException, BadRequestException uniquement

## Pattern controller

```typescript
@UseGuards(AuthGuard)
@Get(':id')
@ApiOperation({ summary: '...' })
@ApiResponse({ status: 200 })
async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
  const resource = await getOwnedResource(id, user.id);
  return resource;
}
```

## Checklist avant de finir

- [ ] Module ajouté à app.module.ts
- [ ] Ownership vérifié dans le service (pas le controller)
- [ ] select sur toutes les queries Prisma
- [ ] Swagger complet sur chaque endpoint
- [ ] pnpm typecheck → 0 erreurs

Référence : apps/api/src/modules/ais/
