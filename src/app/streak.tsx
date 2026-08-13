import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { InfoIcon } from '@/components/brand/icons';
import { HoldToInvest } from '@/components/streak/hold-to-invest';
import { RewardRow } from '@/components/streak/reward-row';
import { StreakRing } from '@/components/streak/streak-ring';
import { useHoldCharge } from '@/components/streak/use-hold-charge';
import { WeekStrip } from '@/components/streak/week-strip';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/back-button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { MIN_DAILY_AMOUNT } from '@/domain/simulation';
import {
  MAX_SHIELDS,
  REWARDS,
  SHIELD_INTERVAL,
  hasContributedToday,
  isAtRisk,
  milestoneProgress,
  nextMilestone,
  rewardStatus,
} from '@/domain/streak';
import { formatINR, pluralDays } from '@/lib/format';
import { actions, select, useFuture } from '@/store/future-store';
import { Layout, Palette, Radius, Spacing, withAlpha } from '@/theme';

/** How many days "Simulate a week" walks through. */
const SIMULATE_DAYS = 7;

/**
 * Wealth Streak.
 *
 * The retention engine, given a whole screen. The ring is the emotional payload — a
 * number that only goes up if you keep showing up — and the reward ladder underneath is
 * what turns "don't break it" into something you are working toward rather than merely
 * protecting.
 *
 * The daily action is a hold rather than a tap, and the ring fills as you hold it, so
 * the gesture physically enacts the thing it commits to. Everything else is derived from
 * the same `streak` the rest of the app reads, so this page cannot drift out of
 * agreement with Today or with the avatar's expression.
 */
export default function StreakScreen() {
  const streak = useFuture(select.streak);
  const contributions = useFuture(select.contributions);
  const profile = useFuture(select.profile);
  const today = useFuture(select.today);
  const dayOffset = useFuture(select.dayOffset);
  const mutating = useFuture(select.mutating);
  const apiError = useFuture(select.error);

  const [showInfo, setShowInfo] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const daily = profile?.dailyAmount ?? MIN_DAILY_AMOUNT;
  const done = hasContributedToday(streak, today);
  const atRisk = isAtRisk(streak, today);
  const target = nextMilestone(streak.current);

  const commit = useCallback(() => void actions.contribute(daily), [daily]);

  // Shared with the ring, so holding the button fills the ring in the same motion.
  const { charge, holding, start, release, reset } = useHoldCharge(commit);

  // The bar stays full through the write, then drains once the outcome is known — on
  // success the real progress has already grown to meet it, and on failure an empty bar
  // is the honest signal that nothing was committed.
  useEffect(() => {
    if (done || apiError) reset();
    // `reset` is stable for the life of the hook; listing it would re-run this on every
    // render and fight the ring's own animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiError, done]);

  /**
   * Demo control.
   *
   * A streak is a thing that takes weeks to feel, which makes it invisible in a review
   * session. This walks the simulated clock forward a day at a time and contributes on
   * each one, through the real endpoints — so shields, milestones and the celebration
   * all fire exactly as they would in life, just faster.
   */
  const simulateWeek = useCallback(async () => {
    setSimulating(true);
    try {
      for (let i = 1; i <= SIMULATE_DAYS; i += 1) {
        await actions.timeTravel(dayOffset + i);
        await actions.contribute(daily);
      }
    } finally {
      setSimulating(false);
    }
  }, [daily, dayOffset]);

  const busy = mutating || simulating;

  return (
    <Screen scroll>
      {/* A detail page, not a tab: it slides in over the tab bar and slides back out,
          which is what makes the back chevron the obvious way home. */}
      <Stack.Screen options={{ animation: 'slide_from_right' }} />

      <View style={styles.header}>
        <BackButton fallback="/(app)/home" />
        <View style={styles.titleWrap}>
          <ThemedText type="title">Wealth Streak</ThemedText>
          <ThemedText type="title">🔥</ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="How the streak works"
          accessibilityState={{ expanded: showInfo }}
          hitSlop={10}
          onPress={() => setShowInfo((v) => !v)}
          style={styles.info}>
          <InfoIcon size={22} color={showInfo ? Palette.brand : Palette.textSecondary} />
        </Pressable>
      </View>

      {showInfo ? (
        <Animated.View entering={FadeInDown.duration(240)} exiting={FadeOut.duration(160)}>
          <Card variant="flat" style={styles.infoCard}>
            <ThemedText type="caption" themeColor="textSecondary">
              Your streak counts consecutive days with a contribution. It survives until a
              full day passes with nothing in it. Every {SHIELD_INTERVAL} unbroken days
              earns a shield — up to {MAX_SHIELDS} — and a shield is spent automatically
              to cover one missed day, so a single bad day never erases weeks of work.
            </ThemedText>
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeIn.duration(400)} style={styles.ringWrap}>
        <StreakRing
          days={streak.current}
          progress={milestoneProgress(streak.current)}
          // Where the ring lands after one more day — what the hold is filling toward.
          previewProgress={milestoneProgress(streak.current + 1)}
          charge={charge}
          caption={
            target
              ? `${target - streak.current} to your ${target}-day reward`
              : 'Every milestone earned'
          }
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.week}>
        <WeekStrip contributions={contributions} today={today} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.stats}>
        <Stat label="Longest run" value={pluralDays(streak.longest)} />
        <View style={styles.statDivider} />
        <Stat
          label="Shields"
          value={`${streak.shields} of ${MAX_SHIELDS}`}
          accent={streak.shields > 0}
        />
      </Animated.View>

      {apiError ? (
        <ErrorState inline error={apiError} onDismiss={actions.clearError} />
      ) : null}

      <View style={styles.action}>
        {done ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <Card variant="flat">
              <ThemedText type="bodyBold" themeColor="brand">
                Day {streak.current} is safe.
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.doneCopy}>
                Come back tomorrow to make it {streak.current + 1}.
              </ThemedText>
            </Card>
          </Animated.View>
        ) : (
          <>
            <HoldToInvest
              label={`Hold to invest ${formatINR(daily)}`}
              charge={charge}
              holding={holding}
              onPressIn={start}
              onPressOut={release}
              loading={busy}
            />
            <ThemedText
              type="caption"
              themeColor={atRisk ? 'error' : 'textTertiary'}
              style={styles.hint}>
              {atRisk
                ? `Let go and your ${pluralDays(streak.current)} streak ends at midnight.`
                : 'Hold until the ring fills. Let go early and nothing is committed.'}
            </ThemedText>
          </>
        )}
      </View>

      <View style={styles.rewards}>
        <ThemedText type="title">Rewards</ThemedText>
        {REWARDS.map((reward, index) => (
          <Animated.View
            key={reward.day}
            entering={FadeInDown.delay(160 + index * 60).duration(320)}>
            <RewardRow
              reward={reward}
              status={rewardStatus(reward, streak)}
              current={streak.current}
            />
          </Animated.View>
        ))}
      </View>

      {/* Deliberately labelled as a demo control rather than dressed up as a feature. */}
      <Card variant="flat" style={styles.demo}>
        <ThemedText type="overline" themeColor="textTertiary">
          Demo controls
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.demoCopy}>
          A streak takes weeks to feel. This advances the simulated clock and invests on
          each day, so milestones fire for real — just sooner.
        </ThemedText>

        <View style={styles.demoRow}>
          <DemoButton
            label={`Live ${SIMULATE_DAYS} days`}
            onPress={() => void simulateWeek()}
            disabled={busy}
          />
          <DemoButton
            label="Skip a day"
            onPress={() => void actions.timeTravel(dayOffset + 1)}
            disabled={busy}
          />
          {dayOffset > 0 ? (
            <DemoButton
              label="Back to today"
              onPress={() => void actions.timeTravel(0)}
              disabled={busy}
            />
          ) : null}
        </View>

        {dayOffset > 0 ? (
          <ThemedText type="caption" themeColor="gold" style={styles.demoCopy}>
            Simulated clock is {pluralDays(dayOffset)} ahead of real time.
          </ThemedText>
        ) : null}
      </Card>
    </Screen>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="bodyBold" themeColor={accent ? 'brand' : 'text'}>
        {value}
      </ThemedText>
    </View>
  );
}

function DemoButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.demoButton,
        pressed && styles.demoButtonPressed,
        disabled && styles.demoButtonInert,
      ]}>
      <ThemedText type="caption" themeColor="text">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBlockStart: Spacing.four,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  // Matches the back button's footprint so the title stays optically centred.
  info: {
    width: Layout.minTouchTarget,
    height: Layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: { marginBlockStart: Spacing.three },
  ringWrap: { marginBlockStart: Spacing.five },
  week: { marginBlockStart: Spacing.five },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBlockStart: Spacing.five,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: withAlpha(Palette.bgCard, 0.6),
  },
  stat: { flex: 1, gap: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: Palette.border },
  action: { marginBlockStart: Spacing.five, gap: Spacing.three },
  doneCopy: { marginBlockStart: Spacing.two },
  hint: { textAlign: 'center' },
  rewards: { marginBlockStart: Spacing.six, gap: Spacing.three },
  demo: { marginBlock: Spacing.six },
  demoCopy: { marginBlockStart: Spacing.two },
  demoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBlockStart: Spacing.three,
  },
  demoButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgElevated,
  },
  demoButtonPressed: { borderColor: Palette.brand },
  demoButtonInert: { opacity: 0.45 },
});
