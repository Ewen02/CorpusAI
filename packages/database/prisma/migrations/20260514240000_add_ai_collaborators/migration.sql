-- AICollaborator: enables team collaboration on AIs.
-- An owner (AI.userId) can invite collaborators (EDITOR / VIEWER) to edit
-- the AI configuration, system prompt and documents. Owners retain exclusive
-- control over deletion, billing and ownership transfer.
--
-- The invite flow uses a one-shot `inviteToken` (7-day expiry). The token is
-- nulled once the invitation is accepted (`acceptedAt` is set).
-- `email` is captured at invite time so the row remains stable even when the
-- target user signs up after receiving the invitation.

-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "AICollaborator" (
    "id" TEXT NOT NULL,
    "aiId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "role" "CollaboratorRole" NOT NULL DEFAULT 'EDITOR',
    "invitedBy" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "inviteToken" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AICollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AICollaborator_inviteToken_key" ON "AICollaborator"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "AICollaborator_aiId_userId_key" ON "AICollaborator"("aiId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AICollaborator_aiId_email_key" ON "AICollaborator"("aiId", "email");

-- CreateIndex
CREATE INDEX "AICollaborator_aiId_idx" ON "AICollaborator"("aiId");

-- CreateIndex
CREATE INDEX "AICollaborator_userId_idx" ON "AICollaborator"("userId");

-- CreateIndex
CREATE INDEX "AICollaborator_inviteToken_idx" ON "AICollaborator"("inviteToken");

-- AddForeignKey
ALTER TABLE "AICollaborator" ADD CONSTRAINT "AICollaborator_aiId_fkey" FOREIGN KEY ("aiId") REFERENCES "AI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AICollaborator" ADD CONSTRAINT "AICollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AICollaborator" ADD CONSTRAINT "AICollaborator_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
