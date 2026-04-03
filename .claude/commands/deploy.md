Checklist pré-deploy de CorpusAI — vérifie que tout est prêt avant un déploiement.

Steps:

1. Run en parallèle :
   - `git status` — working tree doit être clean
   - `pnpm typecheck` — 0 erreurs TypeScript
   - `pnpm lint` — 0 erreurs ESLint
   - `pnpm build` — build réussit

2. Run les tests critiques :
   - `pnpm --filter @corpusai/corpus test` — tests RAG pipeline
   - `pnpm --filter @corpusai/api test` — tests API (si existent)

3. Vérifications manuelles (lister pour l'utilisateur) :
   - Migrations Prisma : `pnpm --filter @corpusai/database exec prisma migrate status`
   - Env vars production : lister les vars requises (DATABASE_URL, REDIS_URL, OPENAI_API_KEY, QDRANT_URL, BETTER_AUTH_SECRET, STRIPE_SECRET_KEY, RESEND_API_KEY)

4. Si tout passe : afficher le résumé

## Output format

```
## Deploy Checklist — YYYY-MM-DD

| Check | Status |
|-------|--------|
| Git clean | ✅ / ❌ |
| TypeScript | ✅ / ❌ (N errors) |
| ESLint | ✅ / ❌ (N errors) |
| Build | ✅ / ❌ |
| Tests corpus | ✅ / ❌ (N/M passed) |
| Tests API | ✅ / ❌ |
| Migrations | ✅ applied / ⚠️ pending |

### Verdict
READY TO DEPLOY / NOT READY — fix N issues
```

Rules:

- Ne JAMAIS déployer automatiquement — ce command est une checklist seulement
- Si des tests échouent : les lister avec le détail de l'erreur
- Si des migrations sont pending : avertir que `prisma migrate deploy` doit être lancé en prod
