/**
 * Layout, shape and motion tokens.
 *
 * Spacing follows a 4pt base. Radii and motion durations mirror the values used on
 * blinkmoney.in so transitions feel like the same product.
 */

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 9,
  md: 12,
  lg: 14,
  xl: 20,
  pill: 9999,
} as const;

/**
 * Durations in ms, easings as cubic-bezier control points. `easeInOut` is the
 * `--default-transition-timing-function` from blinkmoney.in.
 */
export const Motion = {
  fast: 150,
  base: 260,
  slow: 420,
  celebrate: 900,
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
} as const;

export const Layout = {
  /** Keeps text measure readable on tablets instead of stretching edge to edge. */
  maxContentWidth: 560,
  screenPadding: Spacing.four,
  /** Minimum touch target — below this, taps get unreliable on real devices. */
  minTouchTarget: 44,
} as const;
