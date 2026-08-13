/**
 * BlinkMoney colour system.
 *
 * Values are lifted verbatim from the `--color-*` custom properties published on
 * blinkmoney.in, so this is the real brand palette rather than an approximation.
 * FutureOS is dark-only: the identity is #9fe870 on near-black, and a light variant
 * would dilute it.
 *
 * Nothing outside this file should hardcode a hex value.
 */

/** Raw brand values, mapped 1:1 from blinkmoney.in. */
export const Palette = {
  brand: '#9fe870',
  brandSecondary: '#296600',
  brandDecorative: '#3e9900',
  /** Reads as near-black but carries a green cast — used for text on brand fills. */
  brandDeep: '#0c1f00',

  bgPage: '#0c0c0c',
  bgCard: '#1a1a1a',
  bgChip: '#242424',
  bgElevated: '#2a2a2a',

  border: '#1f1f1f',

  textPrimary: '#ffffff',
  textSecondary: '#808080',
  textTertiary: '#4d4d4d',

  error: '#e53935',
  gold: '#c9a94a',
  goldSoft: '#e8c766',

  black: '#000000',
  white: '#ffffff',
} as const;

/**
 * Semantic tokens. Components consume these, never `Palette` directly, so a future
 * rebrand is a one-file change.
 */
export const Colors = {
  text: Palette.textPrimary,
  textSecondary: Palette.textSecondary,
  textTertiary: Palette.textTertiary,
  textOnAccent: Palette.brandDeep,

  background: Palette.bgPage,
  backgroundElement: Palette.bgCard,
  backgroundSelected: Palette.bgElevated,
  chip: Palette.bgChip,

  border: Palette.border,
  borderAccent: Palette.brand,

  brand: Palette.brand,
  brandSecondary: Palette.brandSecondary,
  brandDecorative: Palette.brandDecorative,

  error: Palette.error,
  gold: Palette.gold,
} as const;

export type ThemeColor = keyof typeof Colors;

/**
 * Category accents.
 *
 * Used *only* as icon tints on list surfaces, where four items all wearing brand green
 * would be a wall rather than a list — BlinkMoney's own home screen does the same thing,
 * pairing green Save with blue Borrow. Deliberately never applied to text, fills or
 * borders: the identity stays #9fe870 on near-black.
 */
export const Accent = {
  growth: Palette.brand,
  streak: '#a78bfa',
  goal: Palette.gold,
  safety: '#60a5fa',
} as const;

export type AccentKey = keyof typeof Accent;

/**
 * Alpha helper for overlays and glows. Takes a 6-digit hex and returns 8-digit RGBA,
 * which React Native accepts on both platforms.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const byte = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${byte}`;
}
