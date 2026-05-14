-- After this migration, session and magic-link tokens are stored hashed (SHA-256).
-- Existing plaintext rows would never match a hashed lookup anyway, but clearing them
-- forces a clean state and prevents stale rows from lingering in indexes.
UPDATE "EndUser" SET "sessionToken" = NULL, "sessionExpires" = NULL WHERE "sessionToken" IS NOT NULL;
UPDATE "EndUser" SET "magicLinkToken" = NULL, "magicLinkExpires" = NULL WHERE "magicLinkToken" IS NOT NULL;
