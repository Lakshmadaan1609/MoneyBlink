import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Eyebrow, StatCard } from '@/components/time-machine/atoms';
import { PrimaryButton } from '@/components/time-machine/controls';
import { Screen } from '@/components/ui/screen';
import { useTimeMachinePortfolio } from '@/hooks/use-time-machine-portfolio';
import { formatCompactINR, formatINR } from '@/lib/format';
import { computeSeries, valueAtYear } from '@/lib/projection';
import { pick, timeMachine, useTimeMachine } from '@/store/time-machine';
import { color, radius, space, textReset, type } from '@/theme/tokens';

/**
 * Committed.
 *
 * Deliberately calm. No confetti, no burst, no sound — this is a financial commitment,
 * not a level-up, and celebrating it the way a game would teaches the user that money
 * decisions are supposed to feel exciting. A tick and a comparison is the whole reward.
 *
 * The second and last haptic of the feature fires here.
 */
export default function SuccessScreen() {
  const selectedYear = useTimeMachine(pick.selectedYear);
  const assumedRate = useTimeMachine(pick.assumedRate);
  const portfolio = useTimeMachinePortfolio();

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Returns the machine to `ready` so backing into the Time Machine does not land on a
    // screen still claiming a commit is in flight.
    return () => timeMachine.acknowledgeSuccess();
  }, []);

  const base = {
    currentValue: portfolio.currentValue,
    annualRatePct: assumedRate,
    startYear: portfolio.startYear,
    endYear: portfolio.endYear,
  };
  // The old path is the SIP before the change; the store has already advanced it.
  const oldPath = computeSeries({ ...base, dailySip: portfolio.dailySip - 100 });
  const newPath = computeSeries({ ...base, dailySip: portfolio.dailySip });

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <View style={styles.mark} accessibilityElementsHidden>
          <Text style={styles.tick}>✓</Text>
        </View>

        <View style={styles.head}>
          <Text style={[type.sheetTitle, textReset]}>Your future moved today</Text>
          <Text style={[type.sub, textReset]}>
            {formatINR(portfolio.dailySip)} a day, starting tomorrow
          </Text>
        </View>

        <StatCard
          header={<Eyebrow>Before → after</Eyebrow>}
          rows={[
            {
              label: `${selectedYear}, old path`,
              value: formatCompactINR(valueAtYear(oldPath.points, selectedYear)),
            },
            {
              label: `${selectedYear}, new path`,
              value: formatCompactINR(valueAtYear(newPath.points, selectedYear)),
              tone: 'green',
              divided: true,
            },
          ]}
          footer={
            <>
              <View style={styles.divider} />
              <Text style={[type.sub, textReset]}>One decision, made in 40 seconds.</Text>
            </>
          }
        />

        <Card border="green">
          <Eyebrow tone="green">Tomorrow</Eyebrow>
          <Text style={[type.sub, textReset, styles.tomorrow]}>
            We&apos;ll show you what changed. Small moves compound quietly.
          </Text>
        </Card>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Back to home"
          variant="ghost"
          onPress={() => router.dismissAll()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.gap, paddingTop: 40 },
  mark: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: color.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { color: color.green, fontSize: 24, lineHeight: 28 },
  head: { gap: 6 },
  divider: { height: 1, backgroundColor: color.line, marginVertical: 13 },
  tomorrow: { marginTop: 8, color: color.white },
  footer: { marginTop: 32, marginBottom: 24, borderRadius: radius.cta },
});
