/**
 * Centralised design tokens for CorpusAI.
 *
 * Tokens here mirror the HSL CSS custom properties defined in
 * `apps/web/src/app/globals.css`. Keep this file in sync with that file —
 * the runtime source of truth is CSS variables (themable at the root), but
 * having a JS export lets us reference tokens from charts (Recharts), email
 * templates (React Email), and any non-CSS surface without copy-pasting hex.
 *
 * Glass surface convention: backdrop-blur(16px) + bg white/6% + border white/12%.
 * No gradient buttons — solid `bg-primary` only.
 */

export const colors = {
  primary: 'hsl(238 84% 67%)', // #5468ff — accent violet/cobalt
  primaryForeground: 'hsl(0 0% 100%)',
  cobalt: 'hsl(217 91% 60%)', // accent cobalt
  background: 'hsl(224 18% 7%)', // deep obsidian
  foreground: 'hsl(0 0% 98%)',
  surface1: 'hsl(224 18% 11%)',
  surface2: 'hsl(224 18% 14%)',
  borderDefault: 'hsl(0 0% 100% / 0.12)',
  borderStrong: 'hsl(0 0% 100% / 0.18)',
  muted: 'hsl(0 0% 100% / 0.06)',
  mutedForeground: 'hsl(0 0% 65%)',
  danger: 'hsl(0 75% 60%)',
  warning: 'hsl(38 92% 60%)',
  success: 'hsl(142 70% 45%)',
} as const;

export const radius = {
  sm: '0.375rem', // 6px
  md: '0.625rem', // 10px — default
  lg: '0.875rem', // 14px
  xl: '1.25rem', // 20px
  full: '9999px',
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
} as const;

export const typography = {
  fontSans: 'var(--font-geist), system-ui, sans-serif',
  fontMono: 'var(--font-geist-mono), ui-monospace, monospace',
  fontSerif: 'var(--font-instrument), Georgia, serif',
} as const;

export const shadow = {
  glassPanel: 'inset 0 1px 0 0 hsl(0 0% 100% / 0.08), 0 8px 32px hsl(224 18% 4% / 0.4)',
  glassHover: '0 12px 40px hsl(238 84% 67% / 0.15)',
  accentGlow: '0 0 24px hsl(238 84% 67% / 0.4)',
  lg: '0 8px 24px hsl(224 18% 4% / 0.6)',
} as const;

export const motion = {
  fast: '150ms',
  base: '250ms',
  slow: '400ms',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/** Charts (Recharts) — palette derived from primary + cobalt rotation. */
export const chartColors = [
  colors.primary,
  colors.cobalt,
  'hsl(142 70% 45%)',
  'hsl(38 92% 60%)',
  'hsl(280 85% 65%)',
  'hsl(190 85% 55%)',
  'hsl(340 80% 65%)',
] as const;

export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radius;
export type SpacingToken = keyof typeof spacing;
