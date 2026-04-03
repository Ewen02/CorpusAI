---
name: db-migration
description: Modifie le schéma Prisma ou crée une migration. Triggers : "schéma", "migration", "nouveau champ", "Prisma", "modèle", "index", "relation".
---

Stack : Prisma 6, PostgreSQL (Neon serverless).
Schema : packages/database/prisma/schema.prisma

## Règles critiques

- Index sur tous les champs en WHERE/ORDER BY/FK
- onDelete: Cascade sur les relations enfant
- Timestamps obligatoires : createdAt @default(now()) + updatedAt @updatedAt
- Noms : PascalCase singulier pour les modèles, camelCase pour les champs

## Dev vs Production

- Dev : `pnpm --filter @corpusai/database db:push` (rapide, no migration file)
- Prod : `pnpm --filter @corpusai/database exec prisma migrate dev --name <desc>`

## Après chaque changement — dans l'ordre

1. db:push ou migrate dev
2. `pnpm --filter @corpusai/database build`
3. Mettre à jour packages/database/src/index.ts si nouveaux enums
4. Mettre à jour packages/types/src/ si types API partagés
5. pnpm typecheck

## Checklist

- [ ] Index composites pour les requêtes multi-colonnes
- [ ] onDelete: Cascade sur les enfants
- [ ] Build database package après changement
- [ ] Types partagés dans packages/types/ si besoin
