# @corpusai/database — Prisma Schema & Client

## Schema

Fichier : `prisma/schema.prisma`

### Modeles

- **User** : email, name, image, subscriptionPlan/Status, stripeCustomerId
- **Session** / **Account** / **Verification** : geres par Better Auth
- **AI** : slug (unique), config (systemPrompt, temperature, maxTokens, scoreThreshold), compteurs denormalises, accessType/accessToken/accessCode/inviteOnly, primaryColor, logo
- **Document** : filename, mimeType, size, status, processingStep, progress (0-100), metadata (pageCount, wordCount, language, title, author)
- **Chunk** : content, position, pageNumber, startChar/endChar, qdrantPointId
- **EndUser** : utilisateur final du widget (email, emailVerified, createdAt, updatedAt)
- **AIAccessGrant** : relation many-to-many AI↔EndUser avec status (ACTIVE/REVOKED/EXPIRED), expiresAt
- **Conversation** : aiId, endUserId?, title, messageCount, source (WIDGET/PORTAL/API)
- **Message** : role, content, sources (JSON), confidence, tokenUsage, latencyMs
- **DailyStats** : metriques agregees par jour

### Enums

`SubscriptionPlan`, `SubscriptionStatus`, `AIStatus`, `AccessType`, `AccessStatus`, `DocumentStatus`, `ProcessingStep`, `MessageRole`, `ConfidenceLevel`, `ConversationSource`

### Contrôle d'accès (AI)

| Champ         | Type         | Usage                                                 |
| ------------- | ------------ | ----------------------------------------------------- |
| `accessType`  | `AccessType` | OPEN / GATED / MEMBER                                 |
| `accessToken` | String?      | Token secret (comparaison directe, jamais retourné)   |
| `accessCode`  | String?      | Code bcrypt (jamais retourné au front)                |
| `inviteOnly`  | Boolean      | true = seuls les AIAccessGrant ACTIVE peuvent accéder |

### AIAccessGrant

```prisma
model AIAccessGrant {
  id        String       @id
  aiId      String
  endUserId String
  status    AccessStatus @default(ACTIVE)
  expiresAt DateTime?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  ai        AI           @relation(fields: [aiId], references: [id], onDelete: Cascade)
  endUser   EndUser      @relation(fields: [endUserId], references: [id], onDelete: Cascade)
  @@unique([aiId, endUserId])
}
```

## Exports (src/index.ts)

```typescript
// Tout est re-exporte depuis un seul point d'entree
import { prisma } from '@corpusai/database'; // Singleton Prisma
import { DocumentStatus, MessageRole, AccessStatus } from '@corpusai/database'; // Enums
import type { AI, Document, User, EndUser, AIAccessGrant } from '@corpusai/database'; // Types
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
- Ne JAMAIS retourner `accessToken` ou `accessCode` au frontend
- Utiliser `findFirst` avec where composite pour queries scoped par ownership
- Cascade deletes configures sur toutes les relations enfant
- Les compteurs denormalises (documentCount, conversationCount, questionCount) sont mis a jour atomiquement via `$transaction` ou `update({ increment })`
- `AIAccessGrant` : contrainte unique sur `(aiId, endUserId)` — upsert pour invitations répétées
