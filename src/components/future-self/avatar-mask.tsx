import MaskedView from '@react-native-masked-view/masked-view';
import { memo, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * Where the mask is solid, as fractions of the box.
 *
 * The default is centred and symmetric — the right choice when an avatar floats on a
 * surface with room on every side. Callers that sit the art flush into a corner push the
 * centre toward that corner instead, so the flush edges stay opaque and only the inner
 * ones dissolve.
 */
export type MaskFocus = { cx: string; cy: string; r: string };

export const MASK_CENTRED: MaskFocus = { cx: '50%', cy: '44%', r: '62%' };
export const MASK_BOTTOM_RIGHT: MaskFocus = { cx: '62%', cy: '60%', r: '74%' };

type AvatarMaskProps = {
  width: number;
  height: number;
  focus?: MaskFocus;
  children: ReactNode;
};

/**
 * Dissolves an avatar's baked-in rectangle.
 *
 * The supplied art ships with no alpha channel, so every character sits on an opaque
 * block. Colour-matching a backdrop and fading its edges only works against one flat
 * surface — put the same avatar on a gradient, a card and a page and it reads as a
 * passport photograph pasted on.
 *
 * Masking solves it at the source: the image's alpha is replaced by a radial gradient's,
 * so the figure is fully solid at the centre and genuinely ceases to exist at the edges.
 * There is no rectangle left, so what sits behind it stops mattering.
 *
 * The falloff runs 1 → 1 → 0.5 → 0 rather than a straight ramp; a linear fade leaves a
 * visible ring where the eye catches the gradient's midpoint.
 *
 * `MaskedView` ships inside Expo Go — expo-router already depends on it — so this costs
 * no new native module.
 */
function AvatarMaskBase({ width, height, focus = MASK_CENTRED, children }: AvatarMaskProps) {
  return (
    <View style={{ width, height }} pointerEvents="none">
      <MaskedView
        style={{ width, height }}
        maskElement={
          <Svg width={width} height={height}>
            <Defs>
              <RadialGradient
                id="avatarMask"
                cx={focus.cx}
                cy={focus.cy}
                rx={focus.r}
                ry={focus.r}>
                <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
                <Stop offset="0.6" stopColor="#ffffff" stopOpacity="1" />
                <Stop offset="0.85" stopColor="#ffffff" stopOpacity="0.5" />
                <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width={width} height={height} fill="url(#avatarMask)" />
          </Svg>
        }>
        {children}
      </MaskedView>
    </View>
  );
}

export const AvatarMask = memo(AvatarMaskBase);
