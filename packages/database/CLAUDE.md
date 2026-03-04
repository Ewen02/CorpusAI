# @corpusai/database — Prisma Schema & Client

## Schema

Fichier : `prisma/schema.prisma`

### Modeles
- **User** : email, name, image, subscriptionPlan/Status, stripeCustomerId
- **Session** / **Account** / **Verification** : geres par Better Auth
- **AI** : slug (unique), config (systemPrompt, temperature, maxTokens, scoreThreshold), compteurs denormalises, accessType, primaryColor, logo
- **Document** : filename, mimeType, size, status, processingStep, progress (0-100), metadata (pageCount, wordCount, language, title, author)
- **Chunk** : content, position, pageNumber, startChar/endChar, qdrantPointId
- **EndUser** : utilisateur final du widget (sessionId tracking)
- **Conversation** : aiId, endUserId, title, messageCount
- **Message** : role, content, sources (JSON), confidence, tokenUsage, latencyMs
- **DailyStats** : metriques agregees par jour

### Enums
`SubscriptionPlan`, `SubscriptionStatus`, `AIStatus`, `AccessType`, `DocumentStatus`, `ProcessingStep`, `MessageRole`, `ConfidenceLevel`

## Exports (src/index.ts)

```typescript
// Tout est re-exporte depuis un seul point d'entree
import { prisma } from "@corpusai/database";           // Singleton Prisma
import { DocumentStatus, MessageRole } from "@corpusai/database"; // Enums
import type { AI, Document, User } from "@corpusai/database";     // Types
```

## Commandes

```bash
pnpm --filter @corpusai/database db:push       # Push schema vers la DB
pnpm --filter @corpusai/database db:migrate    # Creer une migration
pnpm --filter @corpusai/database db:studio     # Ouvrir Prisma Studio
pnpm --filter @corpusai/database db:generate   # Regenerer le client
```

## Conventions

- Toujours push le schema AVANT de build les autres packages
- Utiliser `select` pour limiter les champs retournes
- Utiliser `findFirst` avec where composite pour queries scoped par ownership
- Cascade deletes configures sur toutes les relations enfant
- Les compteurs denormalises (documentCount, conversationCount, questionCount) sont mis a jour atomiquement via `$transaction` ou `update({ increment })`
