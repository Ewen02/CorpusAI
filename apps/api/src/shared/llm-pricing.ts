/**
 * Per-model USD pricing matrix and cost computation helpers.
 *
 * Prices are expressed per 1M tokens and reflect the public pricing of each
 * provider as of 2026-Q2. They are intentionally kept in code (not the
 * database) so that historical messages can have their costs recomputed if
 * a new pricing tier is applied retroactively.
 *
 * Sources (validate before raising prices in prod):
 *   - gpt-4o-mini             : $0.150 in / $0.600 out per 1M tokens
 *   - gpt-4o                  : $2.50  in / $10.00 out per 1M tokens
 *   - text-embedding-3-small  : $0.020 in per 1M tokens (no completion side)
 *   - claude-sonnet-4-5       : $3.00  in / $15.00 out per 1M tokens
 *   - claude-haiku-4-5        : $1.00  in / $5.00  out per 1M tokens
 *   - llama-3.3-70b-versatile : $0.59  in / $0.79  out per 1M tokens (Groq)
 *   - llama-3.1-8b-instant    : $0.05  in / $0.08  out per 1M tokens (Groq)
 */

export interface LLMModelPricing {
  /** USD price per 1,000,000 input/prompt tokens. */
  inputPerMillion: number;
  /** USD price per 1,000,000 output/completion tokens. 0 for embedding models. */
  outputPerMillion: number;
}

/**
 * Canonical USD pricing table.
 *
 * Keys are normalized to lowercase to allow case-insensitive lookup. When
 * adding a model, keep the alphabetical order to make diffs reviewable.
 */
export const LLM_PRICING: Readonly<Record<string, LLMModelPricing>> = Object.freeze({
  // Anthropic Claude family
  'claude-haiku-4-5': { inputPerMillion: 1.0, outputPerMillion: 5.0 },
  'claude-sonnet-4-5': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  // OpenAI GPT family
  'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  // Groq (Llama hosted on LPU)
  'llama-3.1-8b-instant': { inputPerMillion: 0.05, outputPerMillion: 0.08 },
  'llama-3.3-70b-versatile': { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  // OpenAI embeddings
  'text-embedding-3-small': { inputPerMillion: 0.02, outputPerMillion: 0 },
});

/** Fallback used when an unknown model identifier is encountered. */
export const DEFAULT_PRICING_MODEL = 'gpt-4o-mini';

/** Rounds a USD amount to 4 decimal places (10^-4 = $0.0001 precision). */
function roundUsd(value: number): number {
  // Avoid floating-point noise by going through a fixed-precision string round-trip.
  return Number.parseFloat(value.toFixed(4));
}

export interface ComputeMessageCostInput {
  /** LLM model identifier (e.g. `gpt-4o-mini`). Case-insensitive. */
  model: string | null | undefined;
  /** Number of prompt tokens consumed. Negative values are clamped to 0. */
  tokensIn: number | null | undefined;
  /** Number of completion tokens generated. Negative values are clamped to 0. */
  tokensOut: number | null | undefined;
}

/**
 * Returns the pricing entry for a given model, falling back to
 * {@link DEFAULT_PRICING_MODEL} when the identifier is unknown.
 */
export function getPricingForModel(model: string | null | undefined): LLMModelPricing {
  const key = (model ?? '').trim().toLowerCase();
  return LLM_PRICING[key] ?? LLM_PRICING[DEFAULT_PRICING_MODEL]!;
}

/**
 * Computes the USD cost of a single LLM call.
 *
 * Contract:
 *  - Always returns a finite number >= 0.
 *  - Unknown models fall back to {@link DEFAULT_PRICING_MODEL} pricing.
 *  - `null`/`undefined`/negative token counts are treated as 0.
 *  - The result is rounded to 4 decimals (matching the persistence precision).
 */
export function computeMessageCost(input: ComputeMessageCostInput): number {
  const pricing = getPricingForModel(input.model);

  const tokensIn = Math.max(0, Math.trunc(input.tokensIn ?? 0));
  const tokensOut = Math.max(0, Math.trunc(input.tokensOut ?? 0));

  if (tokensIn === 0 && tokensOut === 0) {
    return 0;
  }

  const inputCost = (tokensIn / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (tokensOut / 1_000_000) * pricing.outputPerMillion;

  return roundUsd(inputCost + outputCost);
}
