-- Indexes to speed up periodic cleanup of expired sessions and magic links.
-- WHERE clauses on these timestamp columns are run by scheduled cleanup jobs.
CREATE INDEX IF NOT EXISTS "EndUser_sessionExpires_idx" ON "EndUser"("sessionExpires");
CREATE INDEX IF NOT EXISTS "EndUser_magicLinkExpires_idx" ON "EndUser"("magicLinkExpires");
