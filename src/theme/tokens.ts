/**
 * Wealth Time Machine design tokens.
 *
 * Feature-scoped by design. The rest of FutureOS runs on the brand palette extracted
 * from blinkmoney.in (`./colors`); these are the prototype's own values, which sit a
 * shade cooler and darker. The two greens are close enough — #9fe870 against #a8e05a —
 * that the seam is invisible in practice, and keeping them separate means neither has to
 * be bent to fit the other.
 *
 * No hex literal appears anywhere in the Time Machine feature except this file.
 */

import { Platform, type TextStyle } from 'react-native';

import { FontFamily } from './typography';

export const color = {
  bg: '#070907',
  screen: '#0B0F0B',
  panel: '#0E120E',
  card: '#141914',
  sheet: '#101610',
  line: '#242C24',
  lineGreen: '#2E3A2A',
  lineAmber: '#3A3320',
  lineRed: '#3A2420',
  green: '#A8E05A',
  ghost: '#3E4A38',
  white: '#F2F5F0',
  grey: '#8A948A',
  grey2: '#5E665E',
  red: '#E5634D',
  amber: '#E0B44A',
  ctaText: '#0A0F06',
} as const;

export const tint = {
  greenPillBg: 'rgba(168,224,90,0.13)',
  greenCardTop: 'rgba(168,224,90,0.09)',
  greenCardBot: 'rgba(168,224,90,0.02)',
  knobHalo: 'rgba(168,224,90,0.22)',
  amberBannerBg: 'rgba(224,180,74,0.12)',
  scrim: 'rgba(0,0,0,0.55)',
} as const;

export const radius = { card: 14, cta: 12, lever: 12, sheet: 20, pill: 99, screen: 22 } as const;
export const space = { screenX: 21, cardPad: 17, gap: 15 } as const;

/**
 * Weight → family.
 *
 * Mulish is registered one family per weight, so `fontWeight` alone silently renders
 * regular everywhere. The scale below states both: the numeric weight for platforms that
 * synthesise, and the family that actually carries it.
 */
const weight = {
  400: FontFamily.sans,
  500: FontFamily.sansMedium,
  600: FontFamily.sansSemibold,
  700: FontFamily.sansBold,
} as const;

function face(w: 400 | 500 | 600 | 700): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return { fontFamily: weight[w], fontWeight: String(w) as TextStyle['fontWeight'] };
}

/**
 * The prototype's scale, drawn at 274px and multiplied by 1.4 for a ~390dp device.
 *
 * Sizes are absolute rather than `PixelRatio.getFontScale()`-adjusted: React Native
 * already scales these with the system font setting, and pre-scaling would compound it.
 * Layouts below are built to survive 200%.
 */
export const type = {
  big: { fontSize: 42, letterSpacing: -1, color: color.white, ...face(700) },
  sectionValue: { fontSize: 24, color: color.white, ...face(700) },
  sheetTitle: { fontSize: 22, letterSpacing: -0.3, color: color.white, ...face(700) },
  navTitle: { fontSize: 19, color: color.white, ...face(600) },
  navSubtitle: { fontSize: 14, color: color.grey2, ...face(500) },
  sub: { fontSize: 16, lineHeight: 24, color: color.grey, ...face(400) },
  kvKey: { fontSize: 16, color: color.grey, ...face(400) },
  kvValue: { fontSize: 16, color: color.white, ...face(600) },
  leverTitle: { fontSize: 17, color: color.white, ...face(600) },
  leverCaption: { fontSize: 14, color: color.grey, ...face(400) },
  leverDelta: { fontSize: 16, color: color.green, ...face(700) },
  cta: { fontSize: 18, color: color.ctaText, ...face(700) },
  ctaQuiet: { fontSize: 17, color: color.grey, ...face(600) },
  pill: { fontSize: 15, color: color.grey, ...face(400) },
  pillActive: { fontSize: 15, color: color.green, ...face(600) },
  eyebrow: {
    fontSize: 13,
    letterSpacing: 1.6,
    color: color.grey2,
    textTransform: 'uppercase',
    ...face(700),
  },
  disclaimer: { fontSize: 13, lineHeight: 19, color: color.grey2, ...face(400) },
} as const satisfies Record<string, TextStyle>;

/** Android needs the extra padding removed or every number sits a pixel low. */
export const textReset: TextStyle = Platform.select({
  android: { includeFontPadding: false },
  default: {},
})!;
