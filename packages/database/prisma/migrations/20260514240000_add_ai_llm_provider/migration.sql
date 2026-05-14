-- Add a per-AI LLM provider selector. Defaults to "openai" so all existing AIs
-- keep their current behaviour without any backfill. Allowed values today are:
--   - "openai"     : OpenAI Chat Completions API
--   - "anthropic"  : Anthropic Messages API (claude-* models)
--   - "groq"       : Groq's OpenAI-compatible API (llama-* / mixtral-* models)
--
-- Validation is enforced at the DTO level (class-validator @IsIn) rather than
-- via a CHECK constraint so that new providers can be rolled out without a
-- migration. Embeddings always stay on OpenAI and are not affected.

ALTER TABLE "AI"
  ADD COLUMN "llmProvider" TEXT NOT NULL DEFAULT 'openai';
