import { router, type Href } from 'expo-router';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Layout, Palette, Radius } from '@/theme';

type BackButtonProps = {
  /**
   * Overrides the default pop — for screens that step backwards *within* themselves
   * before they hand control back to the navigator.
   */
  onPress?: () => void;
  /**
   * Where to land when there is nothing on the stack to pop: a deep link, a reload in
   * dev, or a screen entered with `replace`. Without it the button would be a dead
   * control, so it hides itself instead.
   */
  fallback?: Href;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Back.
 *
 * Every screen past the entry point gets one, because trapping someone in a flow they
 * can see is wrong is the fastest way to lose them. It is a real 44pt target rather
 * than a bare glyph, and it never renders unless it actually has somewhere to go.
 */
function BackButtonBase({ onPress, fallback, accessibilityLabel = 'Go back', style }: BackButtonProps) {
  const pressed = useSharedValue(0);

  const handle = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // `replace`, not `push`: arriving here with an empty stack means the history is
    // already gone, and pushing would build a loop back to this same screen.
    if (fallback) router.replace(fallback);
  }, [fallback, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.08, { damping: 18, stiffness: 300 }) }],
  }));

  // A control that cannot move is worse than no control: hide rather than mislead.
  if (!onPress && !fallback && !router.canGoBack()) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      onPress={handle}
      style={style}>
      <Animated.View style={[styles.button, animatedStyle]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 5 8 12l7 7"
            stroke={Palette.textPrimary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: Layout.minTouchTarget,
    height: Layout.minTouchTarget,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderColor: Palette.border,
  },
});

export const BackButton = memo(BackButtonBase);
