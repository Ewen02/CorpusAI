import { describe, it, expect } from 'vitest';
import {
  computeMessageCost,
  getPricingForModel,
  LLM_PRICING,
  DEFAULT_PRICING_MODEL,
} from './llm-pricing';

describe('llm-pricing', () => {
  describe('getPricingForModel', () => {
    it('returns the canonical entry for a known model', () => {
      expect(getPricingForModel('gpt-4o-mini')).toEqual({
        inputPerMillion: 0.15,
        outputPerMillion: 0.6,
      });
    });

    it('is case-insensitive', () => {
      expect(getPricingForModel('GPT-4O')).toEqual(LLM_PRICING['gpt-4o']);
    });

    it('falls back to the default model when unknown', () => {
      expect(getPricingForModel('claude-imaginary-9000')).toEqual(
        LLM_PRICING[DEFAULT_PRICING_MODEL]
      );
    });

    it('falls back when the model is null/undefined/empty', () => {
      const expected = LLM_PRICING[DEFAULT_PRICING_MODEL];
      expect(getPricingForModel(null)).toEqual(expected);
      expect(getPricingForModel(undefined)).toEqual(expected);
      expect(getPricingForModel('   ')).toEqual(expected);
    });
  });

  describe('computeMessageCost', () => {
    it('computes the cost for a typical gpt-4o-mini call', () => {
      // 100k prompt + 50k completion @ $0.15/$0.60 per 1M
      // → 0.15 * 100_000/1e6 + 0.60 * 50_000/1e6 = 0.015 + 0.030 = 0.045
      const cost = computeMessageCost({
        model: 'gpt-4o-mini',
        tokensIn: 100_000,
        tokensOut: 50_000,
      });
      expect(cost).toBe(0.045);
    });

    it('computes the cost for gpt-4o using both prompt and completion pricing', () => {
      // 2000 in @ $2.50/M = 0.005 ; 1000 out @ $10/M = 0.01 → 0.015 USD
      const cost = computeMessageCost({ model: 'gpt-4o', tokensIn: 2000, tokensOut: 1000 });
      expect(cost).toBe(0.015);
    });

    it('handles embedding-only models where output cost is zero', () => {
      // text-embedding-3-small: $0.02/M input, $0/M output
      // 10k tokens in → 0.0002 USD ; 99 tokens out should not affect total
      const cost = computeMessageCost({
        model: 'text-embedding-3-small',
        tokensIn: 10_000,
        tokensOut: 99,
      });
      expect(cost).toBe(0.0002);
    });

    it('returns 0 when both token counts are 0/null/undefined', () => {
      expect(computeMessageCost({ model: 'gpt-4o', tokensIn: 0, tokensOut: 0 })).toBe(0);
      expect(computeMessageCost({ model: 'gpt-4o', tokensIn: null, tokensOut: null })).toBe(0);
      expect(
        computeMessageCost({ model: 'gpt-4o', tokensIn: undefined, tokensOut: undefined })
      ).toBe(0);
    });

    it('clamps negative token counts to 0 (defensive guard)', () => {
      // tokensIn = -50_000 should not generate a refund — clamp to 0
      const cost = computeMessageCost({
        model: 'gpt-4o-mini',
        tokensIn: -50_000,
        tokensOut: 100_000,
      });
      // Only completion side contributes: 100_000 * 0.6 / 1e6 = 0.06
      expect(cost).toBe(0.06);
    });

    it('falls back to the default pricing when the model is unknown', () => {
      const knownCost = computeMessageCost({
        model: DEFAULT_PRICING_MODEL,
        tokensIn: 1000,
        tokensOut: 1000,
      });
      const unknownCost = computeMessageCost({
        model: 'mystery-model-2099',
        tokensIn: 1000,
        tokensOut: 1000,
      });
      expect(unknownCost).toBe(knownCost);
    });

    it('always returns a value rounded to at most 4 decimal places', () => {
      // gpt-4o on irregular counts → ensure the rounding contract holds.
      const cost = computeMessageCost({ model: 'gpt-4o', tokensIn: 1234, tokensOut: 567 });
      const decimals = cost.toString().split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(4);
      // Sanity check: result is also non-negative and finite.
      expect(cost).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(cost)).toBe(true);
    });

    it('truncates sub-cent fractions below the 4-decimal precision to 0', () => {
      // 1 token in / 1 token out on gpt-4o-mini → 7.5e-10 USD → rounds to 0
      const cost = computeMessageCost({ model: 'gpt-4o-mini', tokensIn: 1, tokensOut: 1 });
      expect(cost).toBe(0);
    });
  });

  describe('multi-provider pricing (Anthropic + Groq)', () => {
    it('computes claude-sonnet-4-5 cost ($3 in / $15 out per 1M)', () => {
      // 10k in → 0.03 USD ; 2k out → 0.03 USD → 0.06 USD total
      const cost = computeMessageCost({
        model: 'claude-sonnet-4-5',
        tokensIn: 10_000,
        tokensOut: 2_000,
      });
      expect(cost).toBe(0.06);
    });

    it('computes claude-haiku-4-5 cost ($1 in / $5 out per 1M)', () => {
      // 50k in → 0.05 USD ; 10k out → 0.05 USD → 0.10 USD total
      const cost = computeMessageCost({
        model: 'claude-haiku-4-5',
        tokensIn: 50_000,
        tokensOut: 10_000,
      });
      expect(cost).toBe(0.1);
    });

    it('computes llama-3.3-70b-versatile cost (Groq: $0.59 in / $0.79 out)', () => {
      // 100k in → 0.059 ; 50k out → 0.0395 → 0.0985 USD total
      const cost = computeMessageCost({
        model: 'llama-3.3-70b-versatile',
        tokensIn: 100_000,
        tokensOut: 50_000,
      });
      expect(cost).toBe(0.0985);
    });

    it('computes llama-3.1-8b-instant cost (Groq: $0.05 in / $0.08 out)', () => {
      // 1M in → 0.05 ; 500k out → 0.04 → 0.09 USD total
      const cost = computeMessageCost({
        model: 'llama-3.1-8b-instant',
        tokensIn: 1_000_000,
        tokensOut: 500_000,
      });
      expect(cost).toBe(0.09);
    });

    it('looks up Anthropic and Groq models case-insensitively', () => {
      expect(getPricingForModel('CLAUDE-SONNET-4-5')).toEqual(LLM_PRICING['claude-sonnet-4-5']);
      expect(getPricingForModel('Llama-3.1-8b-Instant')).toEqual(
        LLM_PRICING['llama-3.1-8b-instant']
      );
    });

    it('exposes all four new models in the canonical table', () => {
      // Sanity check that pricing entries exist and are well-formed.
      const required = [
        'claude-sonnet-4-5',
        'claude-haiku-4-5',
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
      ];
      for (const model of required) {
        const entry = LLM_PRICING[model];
        expect(entry).toBeDefined();
        expect(entry!.inputPerMillion).toBeGreaterThan(0);
        expect(entry!.outputPerMillion).toBeGreaterThan(0);
      }
    });
  });
});
