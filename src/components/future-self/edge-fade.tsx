import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { Palette } from '@/theme';

type EdgeFadeProps = {
  /** Colour the edges dissolve into — normally the page background. */
  color?: string;
  /** How far the fade reaches inward, in points. */
  size?: number;
  /** Which edges to soften. */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

/**
 * Dissolves the edges of an image into the surrounding page.
 *
 * The avatar art ships without an alpha channel, so every character sits on an opaque
 * rectangle. Rather than cropping the artwork — which would cut into the character —
 * this lays a short gradient over each edge running from the page colour to fully
 * transparent. The rectangle's boundary stops existing visually, and any residual
 * mismatch between the art's baked background and the page is absorbed by the fade.
 *
 * `transparent` is written as an explicit rgba zero-alpha rather than the keyword:
 * Android interpolates the keyword through opaque black, which produces a dark halo
 * exactly where the fade is supposed to be invisible.
 */
function EdgeFadeBase({
  color = Palette.bgPage,
  size = 26,
  edges = ['top', 'bottom', 'left', 'right'],
}: EdgeFadeProps) {
  const clear = 'rgba(0,0,0,0)';

  return (
    <>
      {edges.includes('top') ? (
        <LinearGradient
          colors={[color, clear]}
          style={[styles.horizontal, { top: 0, height: size }]}
          pointerEvents="none"
        />
      ) : null}

      {edges.includes('bottom') ? (
        <LinearGradient
          colors={[clear, color]}
          style={[styles.horizontal, { bottom: 0, height: size }]}
          pointerEvents="none"
        />
      ) : null}

      {edges.includes('left') ? (
        <LinearGradient
          colors={[color, clear]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.vertical, { left: 0, width: size }]}
          pointerEvents="none"
        />
      ) : null}

      {edges.includes('right') ? (
        <LinearGradient
          colors={[clear, color]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.vertical, { right: 0, width: size }]}
          pointerEvents="none"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  horizontal: { position: 'absolute', left: 0, right: 0 },
  vertical: { position: 'absolute', top: 0, bottom: 0 },
});

export const EdgeFade = memo(EdgeFadeBase);
