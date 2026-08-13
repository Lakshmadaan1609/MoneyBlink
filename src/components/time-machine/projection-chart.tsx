import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import type { ProjectionPoint } from '@/lib/projection';
import { color, textReset, type } from '@/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Breathing room so the top of the curve and its end dot are never clipped. */
const PAD = 8;
const MORPH_MS = 600;

type ProjectionChartProps = {
  points: readonly ProjectionPoint[];
  /** The path being compared against — dashed, and never animated. */
  ghostPoints?: readonly ProjectionPoint[];
  variant?: 'area' | 'dual';
  /** 0–1 along the x axis. Drives the dashed marker while the scrubber is dragged. */
  marker?: SharedValue<number>;
  height?: number;
  labels?: { left?: string; right?: string };
  /** Drawn inside the chart in `dual` mode, beside each end dot. */
  seriesLabels?: { primary: string; ghost: string };
  /** Dims the whole chart, for the offline state. */
  dimmed?: boolean;
};

/** Normalises values to 0 (top) … 1 (bottom) against a shared maximum. */
function normalise(points: readonly ProjectionPoint[], max: number): number[] {
  if (max <= 0) return points.map(() => 1);
  return points.map((p) => 1 - p.value / max);
}

function buildLine(ys: readonly number[], w: number, h: number): string {
  'worklet';
  const n = ys.length;
  if (n === 0 || w <= 0) return '';
  const inner = h - PAD * 2;
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const x = n === 1 ? 0 : (i / (n - 1)) * w;
    const y = PAD + ys[i]! * inner;
    d += (i === 0 ? 'M' : ' L') + x.toFixed(2) + ' ' + y.toFixed(2);
  }
  return d;
}

/** Reads the curve's height at an arbitrary x, for placing the marker dot. */
function yAt(ys: readonly number[], t: number, h: number): number {
  'worklet';
  const n = ys.length;
  if (n === 0) return h / 2;
  if (n === 1) return PAD + ys[0]! * (h - PAD * 2);
  const pos = Math.max(0, Math.min(1, t)) * (n - 1);
  const i = Math.min(n - 2, Math.floor(pos));
  const frac = pos - i;
  const value = ys[i]! + (ys[i + 1]! - ys[i]!) * frac;
  return PAD + value * (h - PAD * 2);
}

/**
 * The projection curve.
 *
 * The path is *interpolated*, never remounted: changing the rate or applying a lever
 * morphs the existing `d` string from its old shape to its new one on the UI thread.
 * Rebuilding the `<Path>` would make every assumption change a hard cut, and would drop
 * the marker's position on the way through.
 *
 * Both series share one y scale, so "the green one is higher" means what it looks like.
 */
function ProjectionChartBase({
  points,
  ghostPoints,
  variant = 'area',
  marker,
  height = 132,
  labels,
  seriesLabels,
  dimmed,
}: ProjectionChartProps) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();

  const max = Math.max(
    1,
    ...points.map((p) => p.value),
    ...(ghostPoints ?? []).map((p) => p.value),
  );
  const target = normalise(points, max);
  const ghostYs = ghostPoints ? normalise(ghostPoints, max) : null;

  const from = useSharedValue<number[]>(target);
  const to = useSharedValue<number[]>(target);
  const t = useSharedValue(1);
  const ghost = useSharedValue<number[]>(ghostYs ?? []);
  const ghostFade = useSharedValue(ghostYs ? 1 : 0);

  // Compared as a string: the array identity changes on every render, and morphing to a
  // shape identical to the current one would restart the animation on every keystroke of
  // the scrubber.
  const lastKey = useRef('');
  const key = target.join(',');

  useEffect(() => {
    if (key === lastKey.current) return;
    const first = lastKey.current === '';
    lastKey.current = key;

    if (first || reduced) {
      from.value = target;
      to.value = target;
      t.value = 1;
      return;
    }

    // Snapshot what is actually on screen, not the previous *target* — a change landing
    // mid-morph would otherwise jump backwards to a shape it had already left.
    const progress = t.value;
    const a = from.value;
    const b = to.value;
    from.value = b.map((v, i) => (a[i] ?? v) + (v - (a[i] ?? v)) * progress);
    to.value = target;
    t.value = 0;
    t.value = withTiming(1, { duration: MORPH_MS, easing: Easing.out(Easing.cubic) });
    // `target` is derived from `key`; listing it would fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);

  const ghostKey = ghostYs ? ghostYs.join(',') : '';
  useEffect(() => {
    if (!ghostYs) {
      ghostFade.value = withTiming(0, { duration: 160 });
      return;
    }
    ghost.value = ghostYs;
    ghostFade.value = reduced ? 1 : withTiming(1, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostKey, reduced]);

  /** The live shape, interpolated between the two snapshots. */
  function current() {
    'worklet';
    const a = from.value;
    const b = to.value;
    const out: number[] = [];
    for (let i = 0; i < b.length; i += 1) {
      const start = a[i] ?? b[i]!;
      out.push(start + (b[i]! - start) * t.value);
    }
    return out;
  }

  const lineProps = useAnimatedProps(() => ({ d: buildLine(current(), width, height) }));

  const areaProps = useAnimatedProps(() => {
    const d = buildLine(current(), width, height);
    return { d: d ? `${d} L${width.toFixed(2)} ${height} L0 ${height} Z` : '' };
  });

  const ghostProps = useAnimatedProps(() => ({
    d: buildLine(ghost.value, width, height),
    opacity: ghostFade.value,
  }));

  const endDotProps = useAnimatedProps(() => ({
    cx: width,
    cy: yAt(current(), 1, height),
  }));

  const ghostDotProps = useAnimatedProps(() => ({
    cx: width,
    cy: yAt(ghost.value, 1, height),
    opacity: ghostFade.value,
  }));

  const markerLineProps = useAnimatedProps(() => {
    const x = (marker?.value ?? 0) * width;
    return { x1: x, x2: x, y1: 0, y2: height };
  });

  const markerDotProps = useAnimatedProps(() => {
    const p = marker?.value ?? 0;
    return { cx: p * width, cy: yAt(current(), p, height) };
  });

  return (
    <View style={dimmed ? styles.dimmed : undefined}>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        // The numbers beside the chart carry the information; the shape is decoration to
        // a screen reader and announcing a path would be noise.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="tmArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color.green} stopOpacity={0.28} />
                <Stop offset="1" stopColor={color.green} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {variant === 'area' ? (
              <AnimatedPath animatedProps={areaProps} fill="url(#tmArea)" />
            ) : null}

            {ghostYs ? (
              <>
                <AnimatedPath
                  animatedProps={ghostProps}
                  stroke={color.ghost}
                  strokeWidth={1.8}
                  strokeDasharray="3 3"
                  fill="none"
                />
                <AnimatedCircle animatedProps={ghostDotProps} r={3.5} fill={color.ghost} />
              </>
            ) : null}

            {marker ? (
              <AnimatedLine
                animatedProps={markerLineProps}
                stroke={color.lineGreen}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            ) : null}

            <AnimatedPath
              animatedProps={lineProps}
              stroke={color.green}
              strokeWidth={variant === 'dual' ? 2.6 : 2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            <AnimatedCircle animatedProps={endDotProps} r={4} fill={color.green} />

            {marker ? (
              <>
                <AnimatedCircle
                  animatedProps={markerDotProps}
                  r={8}
                  fill={color.green}
                  opacity={0.18}
                />
                <AnimatedCircle animatedProps={markerDotProps} r={4} fill={color.green} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>

      {seriesLabels ? (
        <View style={styles.seriesLabels}>
          <Text style={[type.leverCaption, textReset, { color: color.green, fontWeight: '700' }]}>
            {seriesLabels.primary}
          </Text>
          <Text style={[type.leverCaption, textReset, { color: color.grey2 }]}>
            {seriesLabels.ghost}
          </Text>
        </View>
      ) : null}

      {labels ? (
        <View style={styles.axis}>
          <Text style={[type.disclaimer, textReset]}>{labels.left}</Text>
          <Text style={[type.disclaimer, textReset]}>{labels.right}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dimmed: { opacity: 0.4 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  seriesLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});

export const ProjectionChart = memo(ProjectionChartBase);
