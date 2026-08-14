/**
 * The single import surface for design tokens.
 *
 * Components import from `@/theme` and nothing else — no hex values, no font family
 * strings, no asset paths scattered through the tree.
 */

import '@/global.css';

export {
  Accent,
  Colors,
  Palette,
  withAlpha,
  type AccentKey,
  type ThemeColor,
} from './colors';
export { FontAssets, FontFamily, Typography, type TextVariant } from './typography';
export { Layout, Motion, Radius, Spacing, contentInset, contentWidth } from './spacing';
export {
  AVATAR_ASPECT,
  AVATAR_BACKDROP,
  DEFAULT_EXPRESSION,
  EXPRESSIONS,
  GENDERS,
  allAvatarsFor,
  avatarAspect,
  avatarBackdrop,
  expressionForState,
  getAvatar,
  getAvatarForState,
  getAvatarMaster,
  type AvatarGender,
  type AvatarState,
  type ExpressionKey,
} from './avatars';
