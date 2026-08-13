import { Image } from 'expo-image';
import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
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
  getAvatar,
  type AvatarGender,
  type ExpressionKey,
} from '@/theme';
import { EdgeFade } from '@/components/future-self/edge-fade';

/** Widest the character is allowed to get on a tablet, in points. */
const MAX_ART_WIDTH = 360;
/** Share of the stage's width the character occupies, leaving a gutter for text. */
const WIDTH_SHARE = 0.86;

type StoryStageProps = {
  gender: AvatarGender;
  expression: ExpressionKey;
  /** Raised while the character is "warm" — after a choice lands. */
  warmth?: number;
  /** Fallback share of the window height, used only until the slot has been measured. */
  heightRatio?: number;
};

/**
 * The character's stage.
 *
 * Anchored to the bottom-right corner so the avatar reads as *present in the room* —
 * standing at the edge of frame looking across at you — rather than as an illustration
 * floating in a card. Pushing them off-centre leaves the left column free for dialogue,
 * so the words and the speaker never fight for the same space.
 *
 * The art is sized from the slot this component is *given*, not from a fraction of the
 * window, so when the options panel opens beneath it the character shrinks to stay fully
 * visible above it instead of hiding behind it. That resize is animated: the character
 * appears to step back to make room, then step forward again once the choice is made.
 *
 * The background stays flat black. "The avatar becomes warmer" is carried entirely by
 * the character — their expression changes and they lean in slightly — rather than by
 * lighting the room, which keeps the art the only thing on screen drawing the eye.
 */
function StoryStageBase({
  gender,
  expression,
  warmth = 0,
  heightRatio = 0.46,
}: StoryStageProps) {
  const window = useWindowDimensions();
  const [slot, setSlot] = useState({ width: 0, height: 0 });

  const boxWidth = slot.width || window.width;
  const boxHeight = slot.height || window.height * heightRatio;

  const aspect = avatarAspect(gender);
  // Constrained on both axes so the character is never cropped by the slot it sits in.
  const artWidth = Math.min(boxWidth * WIDTH_SHARE, boxHeight * aspect, MAX_ART_WIDTH);
  const artHeight = artWidth / aspect;

  const breathe = useSharedValue(0);
  const warm = useSharedValue(0);
  const pop = useSharedValue(0);
  // 1 = at the current art size. Knocked off 1 when the slot changes, then eased back.
  const morph = useSharedValue(1);
  const lastWidth = useRef(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [breathe]);

  useEffect(() => {
    warm.value = withTiming(warmth, { duration: 700, easing: Easing.out(Easing.quad) });
  }, [warm, warmth]);

  // A small beat whenever the expression changes, so each line lands physically.
  useEffect(() => {
    pop.value = withSequence(
      withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 11, stiffness: 200 }),
    );
  }, [expression, pop]);

  // Layout jumps to the new size in one frame; scaling from the old size back to 1 turns
  // that jump into a movement. Skipped on first measure, which has nothing to move from.
  useEffect(() => {
    if (!artWidth) return;
    if (lastWidth.current && lastWidth.current !== artWidth) {
      morph.value = lastWidth.current / artWidth;
      morph.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
    }
    lastWidth.current = artWidth;
  }, [artWidth, morph]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    // Sub-pixel layout noise would otherwise re-render on every frame of an animation.
    setSlot((current) =>
      Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1
        ? current
        : { width, height },
    );
  };

  const avatarStyle = useAnimatedStyle(() => {
    // Warmth reads as the character coming closer, not as a change in lighting.
    const scale = morph.value * (1 + pop.value * 0.03 + warm.value * 0.03);
    return {
      transform: [
        // Scaling happens about the centre; these put the character back on the
        // bottom-right corner they are supposed to be standing in.
        { translateX: (artWidth * (1 - scale)) / 2 },
        {
          translateY:
            (artHeight * (1 - scale)) / 2 -
            breathe.value * 5 -
            pop.value * 6 -
            warm.value * 4,
        },
        { scale },
      ],
    };
  });

  return (
    <View style={styles.stage} onLayout={onLayout} pointerEvents="none">
      <Animated.View style={avatarStyle}>
        {/* Backdrop matches the colour baked into this character's art, so the image
            sits on its own field rather than on a slightly different page colour. */}
        <View
          style={[
            styles.art,
            { width: artWidth, height: artHeight, backgroundColor: avatarBackdrop(gender) },
          ]}>
          <Image
            source={getAvatar(gender, expression)}
            style={{ width: artWidth, height: artHeight }}
            contentFit="contain"
            // Crossfade between expressions so a line change reads as the same person
            // reacting, not as two different pictures swapping.
            transition={260}
            cachePolicy="memory"
            accessibilityLabel={`Your future self, looking ${expression}`}
          />
          {/* Dissolves the rectangle into the page without cutting the artwork. Only
              the two inner edges need it — the bottom and right sit flush against the
              screen, where there is no page colour to seam against. */}
          <EdgeFade size={34} edges={['top', 'left']} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    // The character sits *on* the bottom-right corner; anything past the frame is
    // meant to be cut off.
    overflow: 'hidden',
  },
  art: { overflow: 'hidden' },
});

export const StoryStage = memo(StoryStageBase);
