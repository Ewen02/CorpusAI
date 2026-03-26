import type { ParentChildChunkerOptions } from './types';

/**
 * Default chunker configuration used across API and Worker.
 * Single source of truth to avoid config drift between services.
 */
export const CHUNKER_DEFAULTS: ParentChildChunkerOptions = {
  childSizeTokens: 128,
  parentSizeTokens: 512,
  childOverlapTokens: 32,
} as const;
