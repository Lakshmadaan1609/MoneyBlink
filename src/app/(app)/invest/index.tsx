import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Card, Disclaimer, Eyebrow, StatCard } from '@/components/time-machine/atoms';
import { PrimaryButton } from '@/components/time-machine/controls';
import { Screen } from '@/components/ui/screen';
import { computeSeries } from '@/lib/projection';
import { formatCompactINR, formatINR } from '@/lib/format';
import { firstName } from '@/domain/validation';
import { select, useFuture } from '@/store/future-store';
import { useTimeMachinePortfolio } from '@/hooks/use-time-machine-portfolio';
import { color, radius, space, textReset, tint, type } from '@/theme/tokens';

/**
 * Invest.
 *
 * The entry point to the Time Machine. Everything above the green card is a statement of
 * where you are; the green card is the only thing on screen that talks about where you
 * are going, and it exists to get tapped.
 */
export default function InvestScreen() {
  const profile = useFuture(select.profile);
  const portfolio = useTimeMachinePortfolio();

  const name = profile?.name ? firstName(profile.name) : 'there';

  // The headline figure comes from the same engine the Time Machine uses, so the promise
  // on this card and the hero on the next screen can never disagree.
  const horizonYear = portfolio.startYear + 10;
  const { points } = computeSeries({
    currentValue: portfolio.currentValue,
    dailySip: portfolio.dailySip,
    annualRatePct: 12,
    startYear: portfolio.startYear,
    endYear: horizonYear,
  });
  const atHorizon = points[points.length - 1]?.value ?? 0;

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Text style={[type.navTitle, textReset, styles.greeting]}>Good morning, {name}</Text>

        <View style={styles.hero}>
          <Eyebrow>Current value</Eyebrow>
          <Text style={[type.big, textReset]}>{formatINR(portfolio.currentValue)}</Text>
          <Text style={[type.sub, textReset, { color: color.green }]}>
            +{formatINR(portfolio.allTimeGain)} · {portfolio.allTimeGainPct}% all time
          </Text>
        </View>

        <StatCard
          rows={[
            { label: 'Daily SIP', value: `${formatINR(portfolio.dailySip)} / day` },
            { label: 'Invested', value: formatINR(portfolio.invested), divided: true },
            { label: 'Units', value: portfolio.units.toFixed(2), divided: true },
          ]}
        />

        {/* The one card that looks forward, so it gets the only gradient on the screen. */}
        <Card border="green" style={styles.future}>
          <LinearGradient
            colors={[tint.greenCardTop, tint.greenCardBot]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.futureGradient}
          />
          <Eyebrow tone="green">Your future</Eyebrow>
          <Text style={[type.leverTitle, textReset, styles.futureBody]}>
            At today&apos;s habits you reach{' '}
            <Text style={{ color: color.green }}>{formatCompactINR(atHorizon)}</Text> by{' '}
            {horizonYear}.
          </Text>
          <Text style={[type.sub, textReset, styles.futureSub]}>See what changes it.</Text>
          <PrimaryButton
            label="Open Time Machine"
            onPress={() => router.push('/(app)/invest/time-machine')}
          />
        </Card>

        <StatCard
          rows={[{ label: 'Borrowable now', value: formatINR(portfolio.borrowable), tone: 'green' }]}
        />

        <Disclaimer>
          Illustrative only. Not a projection, forecast or guarantee of returns.
        </Disclaimer>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.gap, paddingTop: 12, paddingBottom: 32 },
  greeting: { marginBottom: 4 },
  hero: { gap: 6 },
  future: { overflow: 'hidden', gap: 10 },
  futureGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  futureBody: { lineHeight: 25 },
  futureSub: { marginBottom: 4 },
  reset: { borderRadius: radius.cta },
});
