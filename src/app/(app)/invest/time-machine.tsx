import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { AnimatedCurrency } from '@/components/time-machine/animated-currency';
import { Card, Disclaimer, Eyebrow, OfflineBanner, StatCard } from '@/components/time-machine/atoms';
import { AssumptionPills, LeverRow, PrimaryButton, Segmented } from '@/components/time-machine/controls';
import { ProjectionChart } from '@/components/time-machine/projection-chart';
import { TimeScrubber, useScrubber } from '@/components/time-machine/scrubber';
import { CommitSheet } from '@/components/time-machine/commit-sheet';
import {
  QueuedCommitCard,
  TimeMachineEmpty,
  TimeMachineError,
  TimeMachineSkeleton,
} from '@/components/time-machine/states';
import { BackButton } from '@/components/ui/back-button';
import { Screen } from '@/components/ui/screen';
import { useTimeMachinePortfolio } from '@/hooks/use-time-machine-portfolio';
import { formatCompactINR, formatINR } from '@/lib/format';
import { computeSeries, milestonesHit, valueAtYear } from '@/lib/projection';
import { setFailureRate, setOffline, setSlowNetwork } from '@/services/time-machine-api';
import { LEVERS, modifiersFor, pick, timeMachine, useTimeMachine } from '@/store/time-machine';
import { color, space, textReset, type } from '@/theme/tokens';

/** Years given their own label under the track. */
const TICK_YEARS = [2026, 2029, 2032, 2036, 2041];

/**
 * Wealth Time Machine.
 *
 * One screen, three modes. Scrubbing, applying a lever and comparing two futures are all
 * the same question asked at different magnifications, so switching between them never
 * navigates — the chart you were reading stays on screen and changes shape.
 *
 * Every figure comes from `computeSeries`. Nothing here is a literal, which is the only
 * way a screen full of future rupees stays honest when the rate is user-selectable.
 */
export default function TimeMachineScreen() {
  const status = useTimeMachine(pick.status);
  const selectedYear = useTimeMachine(pick.selectedYear);
  const assumedRate = useTimeMachine(pick.assumedRate);
  const activeLever = useTimeMachine(pick.activeLever);
  const mode = useTimeMachine(pick.mode);
  const queued = useTimeMachine(pick.queuedCommit);

  const portfolio = useTimeMachinePortfolio();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [devTaps, setDevTaps] = useState(0);
  const [devStage, setDevStage] = useState(0);

  useEffect(() => {
    void timeMachine.load();
  }, []);

  const { startYear, endYear } = portfolio;

  const base = { currentValue: portfolio.currentValue, dailySip: portfolio.dailySip, annualRatePct: assumedRate, startYear, endYear };
  const current = computeSeries(base);
  const levered = computeSeries({ ...base, modifiers: modifiersFor(activeLever) });
  const shown = activeLever ? levered : current;

  // Scrub position drives the hero, the chart marker and the year label from one shared
  // value, so all three move together on the UI thread with no render in the loop.
  const { progress, active, gesture, seek, measure } = useScrubber({
    startYear,
    endYear,
    initialYear: selectedYear,
    onCommit: timeMachine.setSelectedYear,
  });

  // Values indexed by year, handed to the UI thread once so the hero can interpolate
  // between them at 60fps without asking JS for anything.
  const series = useSharedValue<number[]>(shown.points.map((p) => p.value));
  useEffect(() => {
    series.value = shown.points.map((p) => p.value);
  }, [series, shown.points]);

  const heroValue = useDerivedValue(() => {
    const points = series.value;
    if (points.length === 0) return 0;
    const at = progress.value * (points.length - 1);
    const i = Math.floor(at);
    const next = Math.min(points.length - 1, i + 1);
    return points[i]! + (points[next]! - points[i]!) * (at - i);
  });

  const settled = valueAtYear(shown.points, selectedYear);
  const settledBase = valueAtYear(current.points, selectedYear);
  const delta = settled - settledBase;
  const age = portfolio.ageAtStart + (selectedYear - startYear);

  const investedByThen = computeSeries({ ...base, endYear: selectedYear }).summary.invested;
  const growthByThen = Math.max(0, settled - investedByThen);

  /**
   * Hidden dev menu — triple-tap the nav title.
   *
   * Cycles normal → slow → offline → failing → normal. Every non-happy state in the
   * acceptance list is reachable this way on a real device, without airplane mode, a
   * proxy, or a rebuild.
   */
  const onTitleTap = () => {
    const next = devTaps + 1;
    setDevTaps(next);
    if (next < 3) return;

    setDevTaps(0);
    const stage = (devStage + 1) % 4;
    setDevStage(stage);

    setSlowNetwork(stage === 1);
    setOffline(stage === 2);
    setFailureRate(stage === 3 ? 1 : 0);
    void timeMachine.retry();
  };

  if (status === 'loading' || status === 'idle') {
    return (
      <Screen scroll>
        <Nav onTitleTap={onTitleTap} subtitle="Loading" />
        <TimeMachineSkeleton />
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen scroll>
        <Nav onTitleTap={onTitleTap} subtitle="Couldn't load" />
        <TimeMachineError onRetry={() => void timeMachine.retry()} />
      </Screen>
    );
  }

  if (portfolio.currentValue <= 0) {
    return (
      <Screen scroll>
        <Nav onTitleTap={onTitleTap} subtitle="Nothing yet" />
        <TimeMachineEmpty onStart={() => router.back()} />
      </Screen>
    );
  }

  const offline = status === 'offline_queued';

  /* ---------------- Mode C: two futures ---------------- */

  if (mode === 'regret') {
    const lateStart = computeSeries({ ...base, modifiers: { skipMonths: 60 } });
    const consistent = valueAtYear(current.points, selectedYear);
    const late = valueAtYear(lateStart.points, selectedYear);

    return (
      <Screen scroll>
        <Nav onTitleTap={onTitleTap} title="Two futures" subtitle={`${selectedYear} · age ${age}`} />

        <View style={styles.stack}>
          <Segmented
            options={[
              { key: 'single', label: 'One future' },
              { key: 'regret', label: 'Two futures' },
            ]}
            value={mode}
            onChange={(key) => timeMachine.setMode(key as 'single' | 'regret')}
          />

          <ProjectionChart
            points={current.points}
            ghostPoints={lateStart.points}
            variant="dual"
            labels={{ left: String(startYear), right: String(endYear) }}
          />

          <StatCard
            border="green"
            rows={[
              { label: 'Staying consistent', value: formatCompactINR(consistent), tone: 'green' },
              {
                label: 'Starting 5 years later',
                value: formatCompactINR(late),
                tone: 'red',
                divided: true,
              },
              { label: 'Difference', value: formatCompactINR(consistent - late), divided: true },
            ]}
          />

          <Card>
            <Eyebrow>Why the gap is so wide</Eyebrow>
            <Text style={[type.sub, textReset, styles.reason]}>
              The first five years contribute the least money and the most time. Time is
              the part you can&apos;t buy back later.
            </Text>
          </Card>

          <Disclaimer>
            Illustrative only. Not a projection, forecast or guarantee of returns. Assumes{' '}
            {assumedRate}% p.a. — change it any time.
          </Disclaimer>

          <PrimaryButton label="Keep my path" onPress={() => timeMachine.setMode('single')} />
        </View>
      </Screen>
    );
  }

  /* ---------------- Modes A & B ---------------- */

  const leverLabel = activeLever
    ? LEVERS.find((l) => l.key === activeLever)?.title.replace('Add ', '+')
    : undefined;

  return (
    <Screen scroll>
      <Nav
        onTitleTap={onTitleTap}
        subtitle={activeLever ? `${leverLabel} applied` : 'Drag to travel'}
      />

      <View style={styles.stack}>
        {offline ? <OfflineBanner /> : null}

        <View style={styles.hero}>
          <Eyebrow>
            You in {selectedYear} · {offline ? 'last synced' : `age ${age}`}
          </Eyebrow>
          <AnimatedCurrency
            value={heroValue}
            style={offline ? [type.big, { color: color.grey }] : type.big}
            label={`Projected value in ${selectedYear}, ${formatINR(settled)}`}
          />
          {activeLever && delta !== 0 ? (
            <Animated.Text
              entering={FadeIn.duration(240)}
              style={[type.sub, textReset, { color: delta > 0 ? color.green : color.red }]}>
              {delta > 0 ? '▲' : '▼'} {formatCompactINR(Math.abs(delta))} vs your current path
            </Animated.Text>
          ) : (
            <Text style={[type.sub, textReset]}>
              {offline ? 'Updated moments ago' : `If you keep investing ${formatINR(portfolio.dailySip)}/day`}
            </Text>
          )}
        </View>

        <ProjectionChart
          points={shown.points}
          ghostPoints={activeLever ? current.points : undefined}
          variant={activeLever ? 'dual' : 'area'}
          marker={progress}
          dimmed={offline}
          labels={
            activeLever ? { primary: 'with change', ghost: 'today' } : undefined
          }
        />

        <TimeScrubber
          progress={progress}
          active={active}
          gesture={gesture}
          onMeasure={measure}
          startYear={startYear}
          endYear={endYear}
          ticks={TICK_YEARS.filter((y) => y >= startYear && y <= endYear)}
          selectedYear={selectedYear}
          onSeek={seek}
        />

        <StatCard
          rows={[
            { label: 'Invested by then', value: formatINR(investedByThen) },
            { label: 'Growth', value: formatINR(growthByThen), tone: 'green', divided: true },
            {
              label: 'Milestones hit',
              value: `${milestonesHit(settled)} of 6`,
              divided: true,
            },
          ]}
        />

        {activeLever ? null : (
          <View style={styles.assume}>
            <Eyebrow>Assume</Eyebrow>
            <AssumptionPills value={assumedRate} onChange={timeMachine.setAssumedRate} />
          </View>
        )}

        <View style={styles.stack}>
          <Eyebrow>What if you…</Eyebrow>
          {LEVERS.map((lever, index) => {
            const result = computeSeries({ ...base, modifiers: lever.modifiers });
            const leverDelta = valueAtYear(result.points, selectedYear) - settledBase;
            return (
              <LeverRow
                key={lever.key}
                index={index}
                title={lever.title}
                caption={lever.caption}
                variant={lever.variant}
                active={activeLever === lever.key}
                delta={`${leverDelta >= 0 ? '+' : '−'}${formatCompactINR(Math.abs(leverDelta))}`}
                onPress={() => timeMachine.toggleLever(lever.key)}
              />
            );
          })}
        </View>

        {queued ? <QueuedCommitCard dailySip={queued.dailySip} savedAt={queued.savedAt} /> : null}

        {activeLever === 'sip+100' ? (
          <PrimaryButton label="Make this real" onPress={() => setSheetOpen(true)} />
        ) : null}

        {activeLever ? (
          <PrimaryButton
            label="Reset to today"
            variant="quiet"
            onPress={timeMachine.clearLevers}
          />
        ) : (
          <Segmented
            options={[
              { key: 'single', label: 'One future' },
              { key: 'regret', label: 'Two futures' },
            ]}
            value={mode}
            onChange={(key) => timeMachine.setMode(key as 'single' | 'regret')}
          />
        )}

        {offline ? (
          <>
            <Card>
              <Text style={[type.sub, textReset]}>
                Scrubbing still works offline — projections are computed on device.
              </Text>
            </Card>
            <PrimaryButton
              label="Try again now"
              variant="ghost"
              onPress={() => {
                setOffline(false);
                void timeMachine.retry();
              }}
            />
            {queued ? (
              <PrimaryButton
                label="Cancel change"
                variant="quiet"
                onPress={timeMachine.cancelQueued}
              />
            ) : null}
          </>
        ) : null}

        <Disclaimer>
          Illustrative only. Not a projection, forecast or guarantee of returns.
        </Disclaimer>
      </View>

      <CommitSheet
        visible={sheetOpen}
        currentSip={portfolio.dailySip}
        nextSip={portfolio.dailySip + 100}
        difference={delta}
        year={selectedYear}
        onDismiss={() => setSheetOpen(false)}
        onCommitted={() => {
          setSheetOpen(false);
          router.push('/(app)/invest/success');
        }}
      />
    </Screen>
  );
}

function Nav({
  title = 'Wealth Time Machine',
  subtitle,
  onTitleTap,
}: {
  title?: string;
  subtitle: string;
  onTitleTap: () => void;
}) {
  return (
    <View style={styles.nav}>
      <BackButton fallback="/(app)/invest" />
      <Pressable onPress={onTitleTap} style={styles.navText} accessibilityRole="header">
        <Text style={[type.navTitle, textReset]}>{title}</Text>
        <Text style={[type.navSubtitle, textReset]}>{subtitle}</Text>
      </Pressable>
      {/* Balances the back button so the title sits optically centred. */}
      <View style={styles.navSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 18,
  },
  navText: { flex: 1, alignItems: 'center' },
  navSpacer: { width: 44 },
  stack: { gap: space.gap },
  hero: { gap: 6 },
  assume: { gap: 10 },
  reason: { marginTop: 8, color: color.white },
});
