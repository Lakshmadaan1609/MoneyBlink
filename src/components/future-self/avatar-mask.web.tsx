import { memo, useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';

import { MASK_CENTRED, type MaskFocus } from './avatar-mask-focus';

// Mirrors the native module's exports so consumers import the same names on either platform.
export { MASK_BOTTOM_RIGHT, MASK_CENTRED, type MaskFocus } from './avatar-mask-focus';

/**
 * Web implementation of the avatar mask.
 *
 * The native component is `@react-native-masked-view`, whose web build is this, in full:
 *
 *     function MaskedView({ maskElement, ...props }) {
 *       return React.createElement(View, props, maskElement);
 *     }
 *
 * It renders the *mask* and throws the children away. So on web every unframed avatar was
 * drawing the white radial gradient that was supposed to be shaping it, and the character
 * was never mounted at all — the blank blob on the home screen, the profile menu and the
 * share card.
 *
 * Browsers mask natively, so the fix does not need the library. `mask-image` with a radial
 * gradient reproduces the same falloff the SVG describes, composited by the compositor
 * rather than by an extra render pass.
 *
 * The property is assigned through the DOM node rather than through `style`, because
 * react-native-web normalises style objects against a known property list and quietly drops
 * anything it does not recognise — which would put us straight back to an unmasked
 * rectangle. Under react-native-web a `View` ref *is* its DOM element, so this is a direct
 * assignment, not a lookup.
 *
 * Degradation is deliberate: if the assignment cannot happen the avatar still renders, just
 * with its original rectangle. A visible character on a slightly wrong background beats the
 * absent one this file exists to fix.
 */

/** The SVG stops from the native mask, expressed as CSS. Same shape, same falloff. */
function maskCss(focus: MaskFocus): string {
  return (
    `radial-gradient(ellipse ${focus.r} ${focus.r} at ${focus.cx} ${focus.cy}, ` +
    `#fff 0%, #fff 60%, rgba(255,255,255,0.5) 85%, rgba(255,255,255,0) 100%)`
  );
}

type AvatarMaskProps = {
  width: number;
  height: number;
  focus?: MaskFocus;
  children: ReactNode;
};

function AvatarMaskBase({ width, height, focus = MASK_CENTRED, children }: AvatarMaskProps) {
  const ref = useRef<View>(null);

  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node?.style) return;

    const value = maskCss(focus);
    const style = node.style as CSSStyleDeclaration & { webkitMaskImage?: string };
    // Both spellings: the unprefixed property is current, the prefixed one is what Safari
    // still reads.
    style.webkitMaskImage = value;
    style.maskImage = value;
  }, [focus]);

  return (
    <View ref={ref} style={{ width, height, overflow: 'hidden' }} pointerEvents="none">
      {children}
    </View>
  );
}

export const AvatarMask = memo(AvatarMaskBase);
