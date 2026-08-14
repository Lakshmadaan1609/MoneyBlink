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
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Palette, withAlpha } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Matches the hold's drain, so the two never fight over the same arc. */
const FILL_MS = 600;

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
 * The stroke runs through a gradient rather than a flat green: the arc gets brighter the
 * further round it goes, so depth is readable from colour as well as length.
 */
function StreakRingBase({
  days,
  progress,
  previewProgress,
  charge,
  size = 232,
  caption = 'Current Streak',
}: StreakRingProps) {
  const stroke = Math.round(size * 0.062);
  // Inset by half the stroke only. There is no second, wider ring to leave room for, so
  // the arc gets the full frame.
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const fill = useSharedValue(0);
  const breathe = useSharedValue(0);
  // A local stand-in so the worklets below can read a shared value unconditionally,
  // whether or not the caller passed one. Hooks cannot be called behind a branch.
  const ownCharge = useSharedValue(0);
  const held = charge ?? ownCharge;

  const settled = Math.max(0, Math.min(1, progress));
  const preview = Math.max(0, Math.min(1, previewProgress ?? progress));

  useEffect(() => {
    fill.value = withTiming(settled, { duration: FILL_MS, easing: Easing.out(Easing.cubic) });
  }, [fill, settled]);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [breathe]);

  // Inlined rather than calling a shared workletised helper: the arc is the one thing on
  // this screen that must never be wrong, and a closure captured across two worklets is
  // exactly where a stale `preview` would hide.
  const arcProps = useAnimatedProps(() => {
    const shown = fill.value + (preview - fill.value) * held.value;
    return { strokeDashoffset: circumference * (1 - Math.max(0, Math.min(1, shown))) };
  });

  const centreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.012 + held.value * 0.05 }],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Runs across the arc's travel: deep at the twelve-o'clock start, brightest
              where a long streak reaches. */}
          <LinearGradient id="streakArc" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={Palette.brandDecorative} />
            <Stop offset="0.55" stopColor={Palette.brand} />
            <Stop offset="1" stopColor={Palette.goldSoft} />
          </LinearGradient>
        </Defs>

        {/* The unfilled remainder — dim, but present, so the goal is always visible. */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={withAlpha(Palette.brand, 0.12)}
          strokeWidth={stroke}
          fill="none"
        />

        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#streakArc)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          // -90° puts the start of the arc at twelve o'clock instead of three.
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
  centre: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  // The counter is a TextInput under the hood, so it needs its alignment stated.
  count: { fontSize: 64, lineHeight: 74, textAlign: 'center' },
});

export const StreakRing = memo(StreakRingBase);
