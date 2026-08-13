/**
 * BlinkMoney typography.
 *
 * The brand pairs Mulish for interface text with Playfair Display — a serif — for
 * display moments. That pairing is the single strongest signal of their visual
 * language, so display type must never silently fall back to a sans face.
 *
 * Weights are separate font families rather than `fontWeight` values, because
 * @expo-google-fonts registers each weight under its own family name; layering a
 * numeric weight on top produces a synthetic bold on Android.
 */

import {
  Mulish_400Regular,
  Mulish_500Medium,
  Mulish_600SemiBold,
  Mulish_700Bold,
  Mulish_800ExtraBold,
} from '@expo-google-fonts/mulish';
import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { Platform, type TextStyle } from 'react-native';

/** Passed straight to `useFonts` in the root layout. */
export const FontAssets = {
  Mulish_400Regular,
  Mulish_500Medium,
  Mulish_600SemiBold,
  Mulish_700Bold,
  Mulish_800ExtraBold,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} as const;

export const FontFamily = {
  sans: 'Mulish_400Regular',
  sansMedium: 'Mulish_500Medium',
  sansSemibold: 'Mulish_600SemiBold',
  sansBold: 'Mulish_700Bold',
  sansExtrabold: 'Mulish_800ExtraBold',

  display: 'PlayfairDisplay_500Medium',
  displaySemibold: 'PlayfairDisplay_600SemiBold',
  displayBold: 'PlayfairDisplay_700Bold',

  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;

/**
 * The type scale. `display*` is reserved for hero moments — a future value, a
 * milestone, a headline — and everything structural uses Mulish.
 */
export const Typography = {
  displayLarge: {
    fontFamily: FontFamily.displayBold,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -0.5,
  },
  display: {
    fontFamily: FontFamily.displaySemibold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: FontFamily.sansExtrabold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: FontFamily.sans,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyBold: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: FontFamily.sansSemibold,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  overline: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  /** Tabular figures so animated counters do not jitter as digits change. */
  numeric: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof Typography;
