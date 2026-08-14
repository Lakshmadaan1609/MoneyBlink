/**
 * Where an avatar mask is solid, as fractions of its box.
 *
 * Split out from the mask component itself because the component has two implementations —
 * a native one built on `MaskedView` and a web one built on CSS `mask-image` — and both
 * need these values. A platform file cannot import its own module specifier without
 * resolving back to itself, so the shared constants live here and each implementation
 * re-exports them. Consumers keep importing from `./avatar-mask` and see the same surface
 * on every platform.
 */

export type MaskFocus = { cx: string; cy: string; r: string };

/** Centred and symmetric — for an avatar floating with room on every side. */
export const MASK_CENTRED: MaskFocus = { cx: '50%', cy: '44%', r: '62%' };

/**
 * Pushed toward the bottom-right, for art sat flush into that corner: the flush edges stay
 * opaque and only the inner ones dissolve.
 */
export const MASK_BOTTOM_RIGHT: MaskFocus = { cx: '62%', cy: '60%', r: '74%' };
