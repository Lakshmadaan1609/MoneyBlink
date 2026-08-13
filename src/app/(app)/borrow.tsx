import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Screen } from '@/components/ui/screen';
import {
  BORROW_RATE,
  MAX_LTV,
  MIN_DAILY_AMOUNT,
  comparePaths,
} from '@/domain/simulation';
import { formatINR, formatPercent } from '@/lib/format';
import { actions, select, useFuture } from '@/store/future-store';
import { Palette, Radius, Spacing } from '@/theme';

/** Fractions of the available limit, so the options scale with the portfolio. */
const FRACTIONS = [0.25, 0.5, 0.75, 1] as const;
const HORIZON_YEARS = 10;

/**
 * Borrow.
 *
 * The product's whole thesis in one screen: you can have the cash without selling the
 * future. So the screen never just quotes an interest rate — it prices the alternative,
 * in rupees, ten years out. Selling ₹5,000 today does not cost ₹5,000; it costs
 * everything that ₹5,000 would have become.
 */
export default function BorrowScreen() {
  const profile = useFuture(select.profile);
  const portfolio = useFuture(select.portfolio);
  const loans = useFuture(select.loans);
  const mutating = useFuture(select.mutating);
  const apiError = useFuture(select.error);

  const [fraction, setFraction] = useState<number>(0.25);
  const amount = Math.floor(portfolio.availableToBorrow * fraction);

  const comparison = useMemo(
    () =>
      comparePaths(
        amount,
        portfolio,
        profile?.dailyAmount ?? MIN_DAILY_AMOUNT,
        HORIZON_YEARS,
      ),
    [amount, portfolio, profile?.dailyAmount],
  );

  // Nothing invested yet means nothing to borrow against — an honest empty state beats
  // a live screen quoting ₹0 limits.
  if (portfolio.value <= 0) {
    return (
      <Screen center>
        <EmptyState
          title="Nothing to borrow against yet"
          message={`Borrowing is secured by your portfolio, so it unlocks once you've invested. You can borrow up to ${formatPercent(MAX_LTV * 100)} of its value.`}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Animated.View entering={FadeIn.duration(360)} style={styles.header}>
        <ThemedText type="display">Borrow</ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
          Borrow at {formatPercent(BORROW_RATE * 100)} p.a. against your portfolio. Your
          investments keep compounding.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(360)}>
        <Card style={styles.limitCard}>
          <ThemedText type="overline" themeColor="textSecondary">
            Available to borrow
          </ThemedText>
          <AnimatedNumber value={portfolio.availableToBorrow} mode="full" variant="display" />

          <View style={styles.ltvBlock}>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  // Shown against the cap, not against 100%: a bar that fills at 50%
                  // LTV would read as "half used" when it is actually maxed out.
                  { width: `${Math.min(100, Math.round((portfolio.ltv / MAX_LTV) * 100))}%` },
                ]}
              />
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {formatINR(portfolio.outstanding)} borrowed ·{' '}
              {formatPercent(Math.round(portfolio.ltv * 1000) / 10)} of a{' '}
              {formatPercent(MAX_LTV * 100)} limit
            </ThemedText>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.picker}>
        <ThemedText type="caption" themeColor="textSecondary">
          How much do you need?
        </ThemedText>
        <View style={styles.chips}>
          {FRACTIONS.map((value) => {
            const selected = value === fraction;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${Math.round(value * 100)} percent of your limit`}
                onPress={() => setFraction(value)}
                style={[styles.chip, selected && styles.chipOn]}>
                <ThemedText type="bodyBold" themeColor={selected ? 'textOnAccent' : 'text'}>
                  {Math.round(value * 100)}%
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <ThemedText type="title">{formatINR(amount)}</ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(360)}>
        <Card variant="accent" style={styles.compare}>
          <ThemedText type="overline" themeColor="brand">
            If you sold instead
          </ThemedText>
          <ThemedText type="body" themeColor="textSecondary" style={styles.compareCopy}>
            Selling {formatINR(amount)} today would leave you with{' '}
            <ThemedText type="bodyBold" themeColor="error">
              {formatINR(comparison.futureDifference)} less
            </ThemedText>{' '}
            in {HORIZON_YEARS} years. Borrowing costs{' '}
            {formatINR(comparison.interestCost)} in interest and leaves every rupee
            compounding.
          </ThemedText>
        </Card>
      </Animated.View>

      {apiError ? (
        <ErrorState inline error={apiError} onDismiss={actions.clearError} />
      ) : null}

      <View style={styles.action}>
        <Button
          label={amount > 0 ? `Borrow ${formatINR(amount)}` : 'Nothing left to borrow'}
          onPress={() => void actions.borrow(amount)}
          loading={mutating}
          disabled={amount <= 0}
          haptic="medium"
        />
        {loans.length > 0 ? (
          <ThemedText type="caption" themeColor="textTertiary" style={styles.note}>
            {loans.length} active loan{loans.length === 1 ? '' : 's'} ·{' '}
            {formatINR(portfolio.interestAccrued)} interest accrued so far.
          </ThemedText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBlockStart: Spacing.five },
  subtitle: { marginBlockStart: Spacing.two },
  limitCard: { marginBlockStart: Spacing.four },
  ltvBlock: { marginBlockStart: Spacing.four, gap: Spacing.two },
  track: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.bgElevated,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: Radius.pill, backgroundColor: Palette.gold },
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
  compare: { marginBlockStart: Spacing.five },
  compareCopy: { marginBlockStart: Spacing.two },
  action: { marginBlock: Spacing.five, gap: Spacing.three },
  note: { textAlign: 'center' },
});
