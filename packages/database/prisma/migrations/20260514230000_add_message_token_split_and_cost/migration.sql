-- Split token usage into prompt (tokensIn) and completion (tokensOut) counts,
-- persist the estimated USD cost computed from per-model pricing, and pin the
-- model identifier for retroactive cost recomputation.
--
-- The legacy `tokenUsage` column is preserved for backward compatibility and
-- continues to hold the total token count (tokensIn + tokensOut) so existing
-- analytics queries keep working without modification.

ALTER TABLE "Message"
  ADD COLUMN "tokensIn" INTEGER,
  ADD COLUMN "tokensOut" INTEGER,
  ADD COLUMN "cost" DOUBLE PRECISION,
  ADD COLUMN "model" TEXT;

-- Analytics workload regularly filters messages by role over a date range
-- (cost breakdown per day, byModel rollups). The dedicated composite index
-- avoids scanning the full Message table for those reports.
CREATE INDEX "Message_createdAt_role_idx" ON "Message"("createdAt", "role");
