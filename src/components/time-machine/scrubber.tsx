import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { color, radius, textReset, tint, type } from '@/theme/tokens';

const KNOB = 18;

/**
 * Owns the scrub position.
 *
 * The hook holds the shared value rather than the component, for the same reason
 * `useHoldCharge` does: a shared value written inside the component it was passed *to* is
 * a prop mutation, which the React Compiler rejects outright. Here it is a local, and the
 * hero counter and chart marker receive it read-only — which is what lets all three move
 * together on the UI thread with no React render anywhere in the loop.
 */
export function useScrubber({
  startYear,
  endYear,
  initialYear,
  onCommit,
}: {
  startYear: number;
  endYear: number;
  initialYear: number;
  /** Fired on gesture end only. Never during the drag. */
  onCommit: (year: number) => void;
}) {
  const span = Math.max(1, endYear - startYear);
  const progress = useSharedValue(
    Math.min(1, Math.max(0, (initialYear - startYear) / span)),
  );
  const width = useSharedValue(0);
  const start = useSharedValue(0);
  const active = useSharedValue(0);

  function commit(p: number) {
    onCommit(startYear + Math.round(p * span));
  }

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      start.value = progress.value;
      active.value = withTiming(1, { duration: 120 });
    })
    .onUpdate((event) => {
      const w = width.value || 1;
      progress.value = Math.min(1, Math.max(0, start.value + event.translationX / w));
    })
    // `onFinalize`, not `onEnd`: a gesture cancelled by a parent scroll never reaches
    // `onEnd`, and the committed year would silently disagree with the knob.
    .onFinalize(() => {
      active.value = withTiming(0, { duration: 160 });
      runOnJS(commit)(progress.value);
    });

  /** Jump to a year. The tick labels are real targets, not decoration. */
  function seek(year: number) {
    const next = Math.min(1, Math.max(0, (year - startYear) / span));
    progress.value = withTiming(next, { duration: 260, easing: Easing.out(Easing.cubic) });
    onCommit(startYear + Math.round(next * span));
  }

  function measure(w: number) {
    width.value = w;
  }

  return { progress, active, gesture, seek, measure, span };
}

type TimeScrubberProps = {
  progress: SharedValue<number>;
  /** Rises to 1 while dragging, so the knob grows under the thumb. */
  active: SharedValue<number>;
  gesture: GestureType;
  onMeasure: (width: number) => void;
  startYear: number;
  endYear: number;
  /** Years given their own label, positioned by their true fraction of the span. */
  ticks: readonly number[];
  selectedYear: number;
  onSeek: (year: number) => void;
};

/**
 * The year scrubber.
 *
 * Drawn from the same shared value the hero and chart read, so nothing can fall out of
 * step. The 3px track is the affordance; the touch target around it is a full 44pt,
 * because a hairline is something to look at, not something to hit.
 */
function TimeScrubberBase({
  progress,
  active,
  gesture,
  onMeasure,
  startYear,
  endYear,
  ticks,
  selectedYear,
  onSeek,
}: TimeScrubberProps) {
  const span = Math.max(1, endYear - startYear);
  const reduced = useReducedMotion();

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const knobStyle = useAnimatedStyle(() => ({
    left: `${progress.value * 100}%`,
    transform: [{ translateX: -KNOB / 2 }, { scale: reduced ? 1 : 1 + active.value * 0.15 }],
  }));

  return (
    <View>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.hit}
          accessibilityRole="adjustable"
          accessibilityLabel="Year"
          accessibilityValue={{ min: startYear, max: endYear, now: selectedYear }}
          // A screen reader cannot drag, so these actions are the entire control for
          // anyone using one.
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            const delta = event.nativeEvent.actionName === 'increment' ? 1 : -1;
            onSeek(Math.min(endYear, Math.max(startYear, selectedYear + delta)));
          }}
          onLayout={(e) => onMeasure(e.nativeEvent.layout.width)}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          <Animated.View style={[styles.knob, knobStyle]} />
        </View>
      </GestureDetector>

      <View style={styles.ticks}>
        {ticks.map((year) => {
          const activeTick = year === selectedYear;
          return (
            <Pressable
              key={year}
              accessibilityRole="button"
              accessibilityLabel={`Jump to ${year}`}
              hitSlop={10}
              onPress={() => onSeek(year)}
              style={[styles.tick, { left: `${((year - startYear) / span) * 100}%` }]}>
              <Text
                style={[activeTick ? type.pillActive : type.pill, textReset, styles.tickLabel]}>
                {year}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 44, justifyContent: 'center' },
  track: { height: 3, borderRadius: radius.pill, backgroundColor: color.line, overflow: 'hidden' },
  fill: { height: 3, borderRadius: radius.pill, backgroundColor: color.green },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: color.green,
    borderWidth: 3,
    borderColor: color.screen,
    // Stands in for the prototype's `0 0 0 3px` halo, which has no RN equivalent.
    shadowColor: tint.knobHalo,
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
  },
  ticks: { height: 22, marginTop: 4 },
  tick: { position: 'absolute', transform: [{ translateX: -20 }], width: 40, alignItems: 'center' },
  tickLabel: { fontSize: 13 },
});

export const TimeScrubber = memo(TimeScrubberBase);
