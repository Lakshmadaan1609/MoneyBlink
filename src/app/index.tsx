import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Bolt } from '@/components/brand/logo';
import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/states';
import { actions, select, useFuture } from '@/store/future-store';
import { Palette, Spacing } from '@/theme';

/**
 * Boot gate.
 *
 * Shows the brand mark while state is read from disk, then sends the user to whichever
 * step they last reached. Because `onboardingStep` is persisted, closing the app
 * halfway through sign-up resumes exactly where it stopped instead of starting over.
 */
export default function Boot() {
  const status = useFuture(select.status);
  const step = useFuture(select.onboardingStep);
  const error = useFuture(select.error);

  useEffect(() => {
    void actions.hydrate();
  }, []);

  if (status === 'error' && error) {
    return (
      <View style={styles.root}>
        <ErrorState error={error} onRetry={() => void actions.hydrate()} />
      </View>
    );
  }

  if (status === 'ready') {
    switch (step) {
      case 'otp':
        return <Redirect href="/(onboarding)/otp" />;
      case 'details':
        return <Redirect href="/(onboarding)/details" />;
      case 'story':
        return <Redirect href="/(story)/meeting" />;
      case 'done':
        return <Redirect href="/(app)/home" />;
      default:
        return <Redirect href="/(onboarding)/phone" />;
    }
  }

  return <Splash />;
}

/** The brand mark, breathing while the app reads its state. */
function Splash() {
  const scale = useSharedValue(0.8);
  const glow = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.08, { duration: 420, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 220 }),
    );
    glow.value = withDelay(
      300,
      withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [glow, scale]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.35,
    transform: [{ scale: 1 + glow.value * 0.35 }],
  }));

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={markStyle}>
          <Bolt size={92} />
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(400).duration(500)} style={styles.wordmark}>
        <ThemedText type="title">
          Blink
          <ThemedText type="title" themeColor="brand">
            Money
          </ThemedText>
        </ThemedText>
        <ThemedText type="caption" themeColor="textTertiary" style={styles.tagline}>
          India&apos;s first Liquid Wealth Account
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.bgPage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Palette.brand,
  },
  wordmark: { alignItems: 'center', marginBlockStart: Spacing.four },
  tagline: { marginBlockStart: Spacing.one },
});
