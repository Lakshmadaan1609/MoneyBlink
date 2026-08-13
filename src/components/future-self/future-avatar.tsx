import { Image } from 'expo-image';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  avatarAspect,
  avatarBackdrop,
  expressionForState,
  getAvatar,
  Palette,
  Radius,
  type AvatarGender,
  type AvatarState,
  type ExpressionKey,
} from '@/theme';
import { EdgeFade } from './edge-fade';

type FutureAvatarProps = {
  gender: AvatarGender;
  /** Hand over state and let the avatar decide, or pin an expression explicitly. */
  state?: AvatarState;
  expression?: ExpressionKey;
  /** Rendered width; height follows the art's native aspect ratio. */
  size?: number;
  /** Slow idle breathing. Disable in dense grids where motion would distract. */
  breathing?: boolean;
  /** Rounded portrait frame. The art has no alpha channel, so a frame is what makes
   *  its baked-in dark background read as a deliberate portrait rather than a seam. */
  framed?: boolean;
};

/**
 * Future You.
 *
 * The character is the emotional core of the product, so it is never a static picture:
 * it breathes continuously and springs whenever the expression changes, which is what
 * makes a milestone or a broken streak physically register. Both animations run on the
 * UI thread and survive a busy JS thread.
 */
function FutureAvatarBase({
  gender,
  state,
  expression,
  size = 200,
  breathing = true,
  framed = true,
}: FutureAvatarProps) {
  const resolved: ExpressionKey = expression ?? (state ? expressionForState(state) : 'happy');
  const source = getAvatar(gender, resolved);
  const height = useMemo(() => size / avatarAspect(gender), [gender, size]);

  const breath = useSharedValue(0);
  const react = useSharedValue(0);

  useEffect(() => {
    if (!breathing) {
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [breath, breathing]);

  // A beat on every expression change, so the reaction feels earned rather than a swap.
  useEffect(() => {
    react.value = withSequence(
      withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 10, stiffness: 190 }),
    );
  }, [react, resolved]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: breath.value * -3 - react.value * 5 },
      { scale: 1 + react.value * 0.045 },
    ],
  }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={animatedStyle}>
        {/* Painted with the colour baked into this character's own art, so the image
            never sits on a slightly different field than its own background. */}
        <View
          style={[
            { width: size, height, backgroundColor: avatarBackdrop(gender) },
            framed ? styles.framed : styles.bare,
          ]}>
          <Image
            source={source}
            // Explicit dimensions let the layout settle before decode, so nothing jumps.
            style={{ width: size, height }}
            contentFit="cover"
            // Crossfade rather than a hard cut when the expression changes.
            transition={180}
            // Art is bundled, so memory caching alone is enough — no disk round-trip.
            cachePolicy="memory"
            accessibilityLabel={`Future You looking ${resolved}`}
          />
          {/* Unframed avatars dissolve into the page; framed ones already have a
              deliberate border, so softening their edges would just look blurry. */}
          {framed ? null : <EdgeFade size={Math.round(size * 0.14)} />}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  bare: { overflow: 'hidden' },
  framed: {
    overflow: 'hidden',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
  },
});

export const FutureAvatar = memo(FutureAvatarBase);
