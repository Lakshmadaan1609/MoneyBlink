import { memo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Layout, Palette, Radius, Spacing } from '@/theme';

type HoldToInvestProps = {
  label: string;
  /** Read-only charge, 0–1. Owned by `useHoldCharge` in the calling screen. */
  charge: SharedValue<number>;
  holding: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
  loading?: boolean;
};

/**
 * Hold to invest.
 *
 * A tap would be one frame of feedback for the most important action in the product.
 * Holding turns it into a second of building tension: the bar fills, the streak ring
 * fills with it, the haptics tick, and letting go early undoes all of it. That "don't
 * let go" feeling is the same one the streak itself trades on, so the gesture and the
 * mechanic teach each other.
 *
 * Purely presentational — every timer and haptic lives in the hook, which is what lets
 * the ring above share the exact same charge.
 */
function HoldToInvestBase({
  label,
  charge,
  holding,
  onPressIn,
  onPressOut,
  disabled,
  loading,
}: HoldToInvestProps) {
  const [width, setWidth] = useState(0);
  const inert = Boolean(disabled || loading);

  // Anchored left by translating back half the shortfall, because scaleX pivots about
  // the centre. Scaling beats animating `width`, which would relayout every frame.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -(width * (1 - charge.value)) / 2 },
      { scaleX: charge.value },
    ],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - charge.value * 0.02 }],
  }));

  return (
    <Animated.View style={bodyStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Press and hold to confirm"
        accessibilityState={{ disabled: inert, busy: Boolean(loading) }}
        disabled={inert}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.track, inert && styles.inert]}>
        <Animated.View style={[styles.fill, { width }, fillStyle]} pointerEvents="none" />

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="small" color={Palette.brand} />
          ) : (
            <ThemedText type="bodyBold" themeColor={holding ? 'textOnAccent' : 'brand'}>
              {label}
            </ThemedText>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    minHeight: Layout.minTouchTarget + 12,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.brand,
    backgroundColor: Palette.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the sweeping fill inside the pill's rounded ends.
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Palette.brand,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  inert: { opacity: 0.45 },
});

export const HoldToInvest = memo(HoldToInvestBase);
