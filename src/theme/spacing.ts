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

/**
 * Inner width available to a `Screen`'s children at a given viewport width.
 *
 * `Screen` pads the viewport and *then* caps the padded box at `maxContentWidth`, so the
 * cap has to be applied to the already-padded width. Capping first and subtracting padding
 * afterwards — the obvious-looking `min(width, max) - pad * 2` — is only correct while the
 * viewport is narrower than the cap. On anything wider (a desktop browser, a tablet, a
 * large phone in landscape) it returns a figure `2 * screenPadding` too small, and any
 * child sized by it comes out narrower than the box it sits in. That is what left a slice
 * of the next hero slide permanently visible on web.
 *
 * Callers pass `useWindowDimensions().width`, which updates on browser resize and rotation,
 * so anything derived from this stays correct as the window changes.
 */
export function contentWidth(windowWidth: number): number {
  return Math.min(windowWidth - Layout.screenPadding * 2, Layout.maxContentWidth);
}

/**
 * Distance from the viewport's right edge to the content column's right edge.
 *
 * Anything anchored absolutely to the window — a menu hanging off a header control — has
 * to be offset by this to stay attached to the column its trigger lives in. Pinning to
 * `screenPadding` alone leaves it stranded against the window edge on a wide browser,
 * hundreds of pixels from the button that opened it.
 */
export function contentInset(windowWidth: number): number {
  return Math.max(Layout.screenPadding, (windowWidth - contentWidth(windowWidth)) / 2);
}
