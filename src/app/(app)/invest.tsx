import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { ANNUAL_RETURN, MIN_DAILY_AMOUNT, project } from '@/domain/simulation';
import { hasContributedToday } from '@/domain/streak';
import { formatINR } from '@/lib/format';
import { actions, select, useFuture } from '@/store/future-store';
import { Palette, Radius, Spacing } from '@/theme';

/** The ladder BlinkMoney itself quotes, starting at their ₹21/day floor. */
const AMOUNTS = [21, 50, 100, 200, 500] as const;
const HORIZON_YEARS = 10;

/**
 * Invest.
 *
 * The number that matters is not what you put in today — it is what today becomes. So
 * the projection is the hero and the amount is the control beneath it: change the
 * amount and ten years re-counts under your thumb. That live link between a ₹50 tap and
 * a six-figure future is the entire argument for showing up daily.
 */
export default function InvestScreen() {
  const profile = useFuture(select.profile);
  const portfolio = useFuture(select.portfolio);
  const streak = useFuture(select.streak);
  const today = useFuture(select.today);
  const mutating = useFuture(select.mutating);
  const apiError = useFuture(select.error);

  const committed = profile?.dailyAmount ?? MIN_DAILY_AMOUNT;
  const [amount, setAmount] = useState<number>(committed);
  const done = hasContributedToday(streak, today);

  const projected = useMemo(
    () => project(portfolio.value, amount, HORIZON_YEARS),
    [amount, portfolio.value],
  );
  const contributed = amount * 365 * HORIZON_YEARS;

  const invest = async () => {
    // Changing the amount here changes the commitment, not just this one payment —
    // otherwise the streak and every projection would keep quoting the old number.
    if (amount !== committed) await actions.setDailyAmount(amount);
    await actions.contribute(amount);
  };

  return (
    <Screen scroll>
      <Animated.View entering={FadeIn.duration(360)} style={styles.header}>
        <ThemedText type="display">Invest</ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
          Save at {Math.round(ANNUAL_RETURN * 100)}% p.a. Starts at{' '}
          {formatINR(MIN_DAILY_AMOUNT)}/day.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(360)}>
        <Card variant="accent" style={styles.projection}>
          <ThemedText type="overline" themeColor="textSecondary">
            In {HORIZON_YEARS} years you&apos;d have
          </ThemedText>
          <AnimatedNumber value={projected} mode="compact" variant="displayLarge" />
          <ThemedText type="caption" themeColor="textSecondary" style={styles.breakdown}>
            {formatINR(contributed)} of your own money, the rest is compounding.
          </ThemedText>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.picker}>
        <ThemedText type="caption" themeColor="textSecondary">
          Daily amount
        </ThemedText>

        <View style={styles.chips}>
          {AMOUNTS.map((value) => {
            const selected = value === amount;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${formatINR(value)} per day`}
                onPress={() => setAmount(value)}
                style={[styles.chip, selected && styles.chipOn]}>
                <ThemedText
                  type="bodyBold"
                  themeColor={selected ? 'textOnAccent' : 'text'}>
                  {formatINR(value)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {amount !== committed ? (
          <ThemedText type="caption" themeColor="textTertiary" style={styles.note}>
            Investing will make {formatINR(amount)} your new daily commitment.
          </ThemedText>
        ) : null}
      </Animated.View>

      {apiError ? (
        <ErrorState inline error={apiError} onDismiss={actions.clearError} />
      ) : null}

      <View style={styles.action}>
        {done ? (
          <Card variant="flat">
            <ThemedText type="bodyBold" themeColor="brand">
              Already invested today
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.note}>
              You can add more, but the streak only counts once a day — consistency is
              the point, not volume.
            </ThemedText>
            <Button
              label={`Add another ${formatINR(amount)}`}
              variant="secondary"
              onPress={() => void invest()}
              loading={mutating}
              style={styles.again}
            />
          </Card>
        ) : (
          <Button
            label={`Invest ${formatINR(amount)}`}
            onPress={() => void invest()}
            loading={mutating}
            haptic="success"
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBlockStart: Spacing.five },
  subtitle: { marginBlockStart: Spacing.two },
  projection: { marginBlockStart: Spacing.four },
  breakdown: { marginBlockStart: Spacing.two },
  picker: { marginBlockStart: Spacing.five, gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
  },
  chipOn: { backgroundColor: Palette.brand, borderColor: Palette.brand },
  note: { marginBlockStart: Spacing.two },
  action: { marginBlock: Spacing.five },
  again: { marginBlockStart: Spacing.three },
});
