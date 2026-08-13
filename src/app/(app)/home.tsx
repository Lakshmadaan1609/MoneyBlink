import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Logo } from '@/components/brand/logo';
import { FutureAvatar } from '@/components/future-self/future-avatar';
import { useAvatarState } from '@/components/future-self/use-avatar-state';
import { FeatureGrid } from '@/components/home/feature-grid';
import { ThemedText } from '@/components/themed-text';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { MIN_DAILY_AMOUNT } from '@/domain/simulation';
import { hasContributedToday, isAtRisk, milestoneProgress, nextMilestone } from '@/domain/streak';
import { firstName } from '@/domain/validation';
import { formatINR, pluralDays } from '@/lib/format';
import { actions, select, useFuture } from '@/store/future-store';
import { Palette, Radius, Spacing } from '@/theme';

/**
 * Today.
 *
 * Answers one question the moment the app opens: did I make tomorrow better today? The
 * portfolio number is the reward, the streak is the pressure, and the single button is
 * the whole daily loop. Everything else on this screen exists to make that button feel
 * worth pressing.
 */
export default function HomeScreen() {
  const profile = useFuture(select.profile);
  const portfolio = useFuture(select.portfolio);
  const streak = useFuture(select.streak);
  const today = useFuture(select.today);
  const mutating = useFuture(select.mutating);
  const apiError = useFuture(select.error);

  const daily = profile?.dailyAmount ?? MIN_DAILY_AMOUNT;
  const done = hasContributedToday(streak, today);
  const atRisk = isAtRisk(streak, today);
  const target = nextMilestone(streak.current);
  const progress = milestoneProgress(streak.current);

  // The character reads the same state the user does, so the two never disagree.
  const avatarState = useAvatarState();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Logo size={26} />
        <ThemedText type="caption" themeColor="textTertiary">
          {profile?.name ? firstName(profile.name) : 'Welcome'}
        </ThemedText>
      </View>

      <Animated.View entering={FadeIn.duration(360)} style={styles.hero}>
        <ThemedText type="overline" themeColor="textSecondary">
          Your wealth today
        </ThemedText>
        <AnimatedNumber value={portfolio.value} mode="full" variant="displayLarge" />
        <View style={styles.heroMeta}>
          <ThemedText type="small" themeColor="textSecondary">
            {formatINR(portfolio.invested)} invested
          </ThemedText>
          <View style={styles.dot} />
          <ThemedText type="smallBold" themeColor="brand">
            +{formatINR(portfolio.returns)} growth
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(360)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your wealth streak"
          onPress={() => router.navigate('/streak')}>
          <Card variant={atRisk ? 'accent' : 'default'} style={styles.streakCard}>
          <View style={styles.streakTop}>
            <View style={styles.streakLeft}>
              <ThemedText type="overline" themeColor="textSecondary">
                Wealth streak
              </ThemedText>
              <ThemedText type="display">{pluralDays(streak.current)}</ThemedText>
              <ThemedText type="caption" themeColor="textTertiary">
                Longest {pluralDays(streak.longest)} · {streak.shields} shield
                {streak.shields === 1 ? '' : 's'}
              </ThemedText>
            </View>

            <FutureAvatar
              gender={profile?.gender ?? 'male'}
              state={avatarState}
              size={92}
              framed={false}
            />
          </View>

          {target ? (
            <View style={styles.progressBlock}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {target - streak.current} more to your {target}-day milestone
              </ThemedText>
            </View>
          ) : null}
          </Card>
        </Pressable>
      </Animated.View>

      {apiError ? (
        <ErrorState inline error={apiError} onDismiss={actions.clearError} />
      ) : null}

      <Animated.View entering={FadeInDown.delay(160).duration(360)} style={styles.action}>
        {done ? (
          <Card variant="flat">
            <ThemedText type="bodyBold" themeColor="brand">
              Today is done.
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.doneCopy}>
              {formatINR(daily)} is in and compounding. Come back tomorrow to keep the
              streak alive.
            </ThemedText>
          </Card>
        ) : (
          <>
            <Button
              label={`Invest ${formatINR(daily)} today`}
              onPress={() => void actions.contribute(daily)}
              loading={mutating}
              haptic="success"
            />
            <ThemedText type="caption" themeColor="textTertiary" style={styles.actionHint}>
              {atRisk
                ? 'Your streak breaks at midnight without today’s contribution.'
                : 'One tap keeps the streak — and the compounding — going.'}
            </ThemedText>
          </>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(220).duration(360)} style={styles.features}>
        <FeatureGrid />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBlockStart: Spacing.four,
  },
  hero: { marginBlockStart: Spacing.five },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBlockStart: Spacing.two,
    flexWrap: 'wrap',
  },
  dot: { width: 3, height: 3, borderRadius: Radius.pill, backgroundColor: Palette.textTertiary },
  streakCard: { marginBlockStart: Spacing.five },
  streakTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakLeft: { flex: 1, gap: Spacing.one },
  progressBlock: { marginBlockStart: Spacing.four, gap: Spacing.two },
  track: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.bgElevated,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: Radius.pill, backgroundColor: Palette.brand },
  action: { marginBlockStart: Spacing.five },
  features: { marginBlock: Spacing.six },
  actionHint: { textAlign: 'center', marginBlockStart: Spacing.three },
  doneCopy: { marginBlockStart: Spacing.two },
});
