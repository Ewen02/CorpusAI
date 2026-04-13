# @corpusai/database — Prisma Schema & Client

## Models

User, Session, Account, Verification (Better Auth), AI, Document, Chunk, EndUser, AIAccessGrant, Conversation, Message, DailyStats.

## Enums

`SubscriptionPlan`, `SubscriptionStatus`, `AIStatus`, `AICategory`, `AccessType`, `AccessStatus`, `DocumentStatus`, `ProcessingStep`, `MessageRole`, `ConfidenceLevel`, `ConversationSource`

## Access Control (AI)

| Field         | Type         | Usage                                                |
| ------------- | ------------ | ---------------------------------------------------- |
| `accessType`  | `AccessType` | OPEN / GATED / MEMBER                                |
| `accessToken` | String?      | Secret token (direct match, never returned to front) |
| `accessCode`  | String?      | Bcrypt hash (never returned to front)                |
| `inviteOnly`  | Boolean      | true = only ACTIVE AIAccessGrant can access          |

`AIAccessGrant` : unique on `(aiId, endUserId)`, upsert for repeated invites.

## Exports

```typescript
import { prisma } from '@corpusai/database'; // Singleton (extended with soft-delete)
import { DocumentStatus, MessageRole } from '@corpusai/database'; // Enums
import type { AI, Document, User, EndUser } from '@corpusai/database'; // Types
```

## Commands

`db:push` (push schema), `db:migrate` (create migration), `db:studio`, `db:generate`.

## Conventions

- Push schema BEFORE building other packages
- Use `select` to limit returned fields
- NEVER return `accessToken` or `accessCode` to frontend
- Cascade deletes on all child relations
- Denormalized counters updated atomically via `$transaction` or `update({ increment })`
