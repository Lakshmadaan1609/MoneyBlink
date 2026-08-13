import * as Haptics from 'expo-haptics';
import { memo, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { FutureAvatar } from '@/components/future-self/future-avatar';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { REWARDS } from '@/domain/streak';
import { actions, select, useFuture } from '@/store/future-store';
import { Layout, Palette, Radius, Spacing, withAlpha } from '@/theme';

const PARTICLES = 18;
const BURST_MS = 1400;

/**
 * Milestone celebration.
 *
 * Mounted once at the root so it fires wherever the contribution was made — Today,
 * Invest or the streak screen itself. Crossing 7, 30, 100 or 365 days is the single
 * biggest emotional beat the product has, and a toast would waste it.
 *
 * The overlay is modal on purpose: it demands one tap to dismiss, which is what turns a
 * number going up into a moment the user remembers having.
 */
function CelebrationBase() {
  const event = useFuture(select.event);
  const profile = useFuture(select.profile);
  const { width } = useWindowDimensions();

  const burst = useSharedValue(0);
  const showing = event?.kind === 'milestone';
  const milestone = showing ? event.milestone : null;

  useEffect(() => {
    if (!showing) {
      burst.value = 0;
      return;
    }
    burst.value = withDelay(
      120,
      withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) }),
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [burst, showing]);

  if (!showing || milestone === null) return null;

  const reward = REWARDS.find((r) => r.day === milestone);
  const spread = Math.min(width * 0.42, 190);

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
      style={styles.overlay}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive">
      <View style={styles.burst} pointerEvents="none">
        {Array.from({ length: PARTICLES }, (_, i) => (
          <Particle key={i} index={i} progress={burst} spread={spread} />
        ))}
      </View>

      <Animated.View entering={ZoomIn.delay(80).duration(420)} style={styles.card}>
        <FutureAvatar
          gender={profile?.gender ?? 'male'}
          // The state map turns 30 and 100 into a laugh and 365 into pure swagger.
          state={{ streak: milestone, milestoneReached: milestone }}
          size={168}
          framed={false}
        />

        <ThemedText type="overline" themeColor="brand" style={styles.centered}>
          Milestone unlocked
        </ThemedText>
        <ThemedText type="displayLarge" style={styles.centered}>
          {milestone} days
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.centered}>
          {milestone === 365
            ? 'A full year without missing. You are the reason this product exists.'
            : `You have shown up ${milestone} days running. That is the whole game.`}
        </ThemedText>

        {reward ? (
          <View style={styles.reward}>
            <ThemedText type="smallBold" themeColor="gold">
              {reward.label} unlocked
            </ThemedText>
          </View>
        ) : null}

        <Button
          label="Keep going"
          onPress={actions.clearEvent}
          haptic="success"
          style={styles.cta}
        />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * One spark.
 *
 * Angle and distance are derived from the index rather than randomised: the burst has to
 * look identical every time it replays, and `Math.random` inside a render would reshuffle
 * the pattern on any re-render mid-animation.
 */
const Particle = memo(function Particle({
  index,
  progress,
  spread,
}: {
  index: number;
  progress: { value: number };
  spread: number;
}) {
  const angle = (index / PARTICLES) * Math.PI * 2;
  // Two interleaved rings so the burst reads as depth rather than a clock face.
  const distance = spread * (index % 2 === 0 ? 1 : 0.62);
  const size = index % 3 === 0 ? 10 : 6;
  const color = index % 3 === 0 ? Palette.gold : Palette.brand;

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85,
      transform: [
        { translateX: Math.cos(angle) * distance * t },
        { translateY: Math.sin(angle) * distance * t - t * t * 40 },
        { scale: 0.4 + t * 0.8 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { width: size, height: size, backgroundColor: color },
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.screenPadding,
    backgroundColor: withAlpha(Palette.black, 0.92),
  },
  burst: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute', borderRadius: Radius.pill },
  card: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignItems: 'center',
    gap: Spacing.two,
  },
  centered: { textAlign: 'center' },
  reward: {
    marginBlockStart: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: withAlpha(Palette.gold, 0.14),
  },
  cta: { marginBlockStart: Spacing.five },
});

export const Celebration = memo(CelebrationBase);
