import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Palette, withAlpha } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type StreakRingProps = {
  /** Days in the current streak — the number in the middle. */
  days: number;
  /** Fill fraction, 0–1. */
  progress: number;
  /**
   * Where the ring would sit after one more day. Previewed live while the user holds
   * the invest button, so they can see what they are about to earn before they earn it.
   */
  previewProgress?: number;
  /** 0–1 hold charge, shared with the invest button so the two move as one. */
  charge?: SharedValue<number>;
  size?: number;
  caption?: string;
};

/**
 * The streak ring.
 *
 * The arc is driven through `useAnimatedProps` on the SVG circle itself, so filling it
 * costs zero React renders — the number in the middle counts up on the UI thread at the
 * same time, and neither stutters if the JS thread is busy persisting a contribution.
 *
 * The glow is a second, much wider stroke of the same arc at low opacity rather than a
 * blur filter: SVG filters are unreliable on Android and expensive to composite every
 * frame, while a fat translucent stroke reads as light and costs nothing.
 */
function StreakRingBase({
  days,
  progress,
  previewProgress,
  charge,
  size = 232,
  caption = 'Current Streak',
}: StreakRingProps) {
  const stroke = Math.round(size * 0.055);
  const glowStroke = stroke * 3.2;
  // Inset by the widest stroke so the glow is never clipped by the SVG viewport.
  const radius = (size - glowStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const fill = useSharedValue(0);
  const breathe = useSharedValue(0);
  // A local stand-in so the worklets below can read a shared value unconditionally,
  // whether or not the caller passed one. Hooks cannot be called behind a branch.
  const ownCharge = useSharedValue(0);
  const held = charge ?? ownCharge;
  const preview = Math.max(0, Math.min(1, previewProgress ?? progress));

  useEffect(() => {
    fill.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [fill, progress]);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [breathe]);

  /** Settled progress, plus however far the current hold has pushed it. */
  function charged() {
    'worklet';
    return fill.value + (preview - fill.value) * held.value;
  }

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - charged()),
  }));

  const glowProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - charged()),
    // The light pulses with the arc rather than independently, so a short streak has a
    // faint halo and a long one genuinely burns — and a hold visibly stokes it.
    strokeOpacity: 0.1 + charged() * (0.16 + breathe.value * 0.1) + held.value * 0.22,
  }));

  const centreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.012 + held.value * 0.06 }],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* The unfilled remainder — dim, but present, so the goal is always visible. */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={withAlpha(Palette.brand, 0.14)}
          strokeWidth={stroke}
          fill="none"
        />

        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={Palette.brand}
          strokeWidth={glowStroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          // -90° puts the start of the arc at twelve o'clock instead of three.
          transform={`rotate(-90 ${center} ${center})`}
          animatedProps={glowProps}
        />

        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={Palette.brand}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          transform={`rotate(-90 ${center} ${center})`}
          animatedProps={arcProps}
        />
      </Svg>

      <Animated.View style={[styles.centre, centreStyle]} pointerEvents="none">
        <AnimatedNumber value={days} mode="plain" variant="displayLarge" style={styles.count} />
        <ThemedText type="title">Days</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {caption}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  centre: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The counter is a TextInput under the hood, so it needs its alignment stated.
  count: { fontSize: 64, lineHeight: 74, textAlign: 'center' },
});

export const StreakRing = memo(StreakRingBase);
