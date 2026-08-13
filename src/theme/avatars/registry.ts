/**
 * Avatar asset registry.
 *
 * `require` of an image is resolved by Metro at build time, so every path must be a
 * static literal — a computed path would silently fail. Listing them explicitly is the
 * cost of that, and in exchange every asset is verified at bundle time rather than
 * blowing up on a screen the reviewer happens to open.
 *
 * Art is supplied as raster (the "SVG" files in the source drop were PNGs wrapped in an
 * `<image>` tag, per the vendor's own manifest, so they offered no scaling benefit and
 * were ~33% larger). The PNGs are therefore the real assets.
 */

import type { ImageSourcePropType } from 'react-native';

import type { AvatarGender, ExpressionKey } from './manifest';

type ExpressionMap = Record<ExpressionKey, ImageSourcePropType>;

const male: ExpressionMap = {
  happy: require('@/assets/avatars/male/happy.png'),
  laughing: require('@/assets/avatars/male/laughing.png'),
  wink: require('@/assets/avatars/male/wink.png'),
  thinking: require('@/assets/avatars/male/thinking.png'),
  surprised: require('@/assets/avatars/male/surprised.png'),
  confident: require('@/assets/avatars/male/confident.png'),
  excited: require('@/assets/avatars/male/excited.png'),
  cool: require('@/assets/avatars/male/cool.png'),
  sad: require('@/assets/avatars/male/sad.png'),
  serious: require('@/assets/avatars/male/serious.png'),
  confused: require('@/assets/avatars/male/confused.png'),
  hello: require('@/assets/avatars/male/hello.png'),
};

const female: ExpressionMap = {
  happy: require('@/assets/avatars/female/happy.png'),
  laughing: require('@/assets/avatars/female/laughing.png'),
  wink: require('@/assets/avatars/female/wink.png'),
  thinking: require('@/assets/avatars/female/thinking.png'),
  surprised: require('@/assets/avatars/female/surprised.png'),
  confident: require('@/assets/avatars/female/confident.png'),
  excited: require('@/assets/avatars/female/excited.png'),
  cool: require('@/assets/avatars/female/cool.png'),
  sad: require('@/assets/avatars/female/sad.png'),
  serious: require('@/assets/avatars/female/serious.png'),
  confused: require('@/assets/avatars/female/confused.png'),
  hello: require('@/assets/avatars/female/hello.png'),
};

export const AVATAR_REGISTRY: Record<AvatarGender, ExpressionMap> = { male, female };

/** Full-body art, used for the onboarding reveal. */
export const AVATAR_MASTERS: Record<AvatarGender, ImageSourcePropType> = {
  male: require('@/assets/avatars/male/master.png'),
  female: require('@/assets/avatars/female/master.png'),
};

/**
 * Native aspect ratio (width / height) of the expression art, per gender.
 *
 * The two sets were delivered at different crops — the male art is half-body at
 * 248×433, the female head-and-shoulders at 220×246 — so a single fixed frame would
 * distort one of them. Components read the ratio from here instead of assuming.
 */
export const AVATAR_ASPECT: Record<AvatarGender, number> = {
  male: 248 / 433,
  female: 220 / 246,
};

/**
 * The flat background baked into each character's art, sampled from the source PNGs.
 *
 * The art has no alpha channel, so every avatar carries an opaque rectangle. The two
 * sets were rendered on slightly different fields — the male on near-black, the female
 * a few steps lighter — so a single page colour cannot match both. Components paint
 * this behind the image and feather the outer edge into the page, which hides the seam
 * without altering the artwork.
 */
export const AVATAR_BACKDROP: Record<AvatarGender, string> = {
  male: '#0b0a0a',
  female: '#121213',
};
