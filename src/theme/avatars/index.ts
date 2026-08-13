/**
 * Avatar resolution.
 *
 * Call sites ask for a character by gender and expression — or better, hand over app
 * state and let this module decide. Art paths never leak into components, so assets can
 * be re-cropped, re-exported or replaced without touching a screen.
 */

import type { ImageSourcePropType } from 'react-native';

import {
  DEFAULT_EXPRESSION,
  expressionForState,
  type AvatarGender,
  type AvatarState,
  type ExpressionKey,
} from './manifest';
import { AVATAR_ASPECT, AVATAR_BACKDROP, AVATAR_MASTERS, AVATAR_REGISTRY } from './registry';

export {
  DEFAULT_EXPRESSION,
  EXPRESSIONS,
  GENDERS,
  expressionForState,
  type AvatarGender,
  type AvatarState,
  type ExpressionKey,
} from './manifest';
export { AVATAR_ASPECT, AVATAR_BACKDROP } from './registry';

/**
 * Resolves an expression, degrading rather than crashing: an unknown key falls back to
 * the resting expression. A missing face is a content problem, never a reason to take
 * the screen down.
 */
export function getAvatar(
  gender: AvatarGender,
  expression: ExpressionKey = DEFAULT_EXPRESSION,
): ImageSourcePropType {
  const set = AVATAR_REGISTRY[gender] ?? AVATAR_REGISTRY.male;
  return set[expression] ?? set[DEFAULT_EXPRESSION];
}

export function getAvatarMaster(gender: AvatarGender): ImageSourcePropType {
  return AVATAR_MASTERS[gender] ?? AVATAR_MASTERS.male;
}

/** Derive the expression from state and resolve it in one step. */
export function getAvatarForState(
  gender: AvatarGender,
  state: AvatarState,
): ImageSourcePropType {
  return getAvatar(gender, expressionForState(state));
}

/** Native width/height ratio of a gender's expression art. */
export function avatarAspect(gender: AvatarGender): number {
  return AVATAR_ASPECT[gender] ?? AVATAR_ASPECT.male;
}

/** The flat colour baked behind a gender's art, for seamless compositing. */
export function avatarBackdrop(gender: AvatarGender): string {
  return AVATAR_BACKDROP[gender] ?? AVATAR_BACKDROP.male;
}

/** Every expression for a gender — preloaded at boot so changes never flash empty. */
export function allAvatarsFor(gender: AvatarGender): ImageSourcePropType[] {
  return Object.values(AVATAR_REGISTRY[gender] ?? {});
}
