import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
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

/** Breathing room so a peak at the very top is not clipped by the stroke width. */
const PAD = 6;

type ProjectionChartProps = {
  points: readonly ProjectionPoint[];
  /** The path being compared against — drawn dashed, behind. */
  ghostPoints?: readonly ProjectionPoint[];
  variant?: 'area' | 'dual';
  /** 0–1 along the x axis. Drives the dashed marker and its dot. */
  marker?: SharedValue<number>;
  height?: number;
  labels?: { left?: string; right?: string; ghost?: string; primary?: string };
  /** Dims the whole chart, for the offline state. */
  dimmed?: boolean;
};

/**
 * The projection curve.
 *
 * The `d` string is built inside a worklet from shared values, so changing the rate or
 * applying a lever *interpolates the existing path* rather than unmounting one Svg and
 * mounting another. A remount would flash and would throw away the shape the user was
 * looking at, which on a chart reads as a glitch rather than a change.
 *
 * Both series are normalised against one shared y-domain, so the two futures in the
 * regret view are honestly comparable — separate scales would make the worse path look
 * just as steep as the better one.
 */
function ProjectionChartBase({
  points,
  ghostPoints,
  variant = 'area',
  marker,
  height = 134,
  labels,
  dimmed,
}: ProjectionChartProps) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();

  const max = Math.max(
    1,
    ...points.map((p) => p.value),
    ...(ghostPoints ?? []).map((p) => p.value),
  );

  // Normalised to 0 (bottom) … 1 (top). Fixed length: the horizon never changes, so the
  // two ends of every interpolation always line up.
  const ys = points.map((p) => p.value / max);
  const ghostYs = (ghostPoints ?? []).map((p) => p.value / max);

  const from = useSharedValue<number[]>(ys);
  const to = useSharedValue<number[]>(ys);
  const t = useSharedValue(1);
  const ghost = useSharedValue<number[]>(ghostYs);
  const ghostFade = useSharedValue(ghostYs.length > 0 ? 1 : 0);

  const signature = `${max}|${ys.join(',')}`;
  const lastSignature = useRef(signature);

  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;

    if (reduced) {
      from.value = ys;
      to.value = ys;
      t.value = 1;
      return;
    }

    // Start from what is actually on screen, not from the previous *target*: a change
    // arriving mid-animation would otherwise snap backwards before moving forwards.
    const current = from.value.map((y, i) => y + ((to.value[i] ?? y) - y) * t.value);
    from.value = current.length === ys.length ? current : ys;
    to.value = ys;
    t.value = 0;
    t.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
  }, [from, reduced, signature, t, to, ys]);

  useEffect(() => {
    ghost.value = ghostYs;
    ghostFade.value = reduced
      ? ghostYs.length > 0
        ? 1
        : 0
      : withTiming(ghostYs.length > 0 ? 1 : 0, { duration: 200 });
  }, [ghost, ghostFade, ghostYs, reduced]);

  const plotHeight = height - PAD * 2;

  /** Interpolated y values, in svg coordinates. */
  function shape() {
    'worklet';
    const a = from.value;
    const b = to.value;
    const out: number[] = [];
    for (let i = 0; i < b.length; i += 1) {
      const start = a[i] ?? b[i]!;
      const value = start + (b[i]! - start) * t.value;
      // 1 is the top of the plot, 0 the bottom — svg y grows downwards.
      out.push(PAD + (1 - value) * plotHeight);
    }
    return out;
  }

  function line(pts: number[], w: number) {
    'worklet';
    const n = pts.length;
    if (n < 2 || w <= 0) return '';
    let d = '';
    for (let i = 0; i < n; i += 1) {
      const x = (i / (n - 1)) * w;
      d += (i === 0 ? 'M' : ' L') + x.toFixed(2) + ' ' + pts[i]!.toFixed(2);
    }
    return d;
  }

  const lineProps = useAnimatedProps(() => ({ d: line(shape(), width) }));

  const areaProps = useAnimatedProps(() => {
    const d = line(shape(), width);
    // Closed down to the baseline so the gradient has something to fill.
    return { d: d ? `${d} L${width.toFixed(2)} ${height} L0 ${height} Z` : '' };
  });

  const ghostProps = useAnimatedProps(() => {
    const pts = ghost.value.map((v) => PAD + (1 - v) * plotHeight);
    return { d: line(pts, width), strokeOpacity: ghostFade.value };
  });

  /** y at the marker's x, read off the same interpolated shape the line uses. */
  function markerY() {
    'worklet';
    const pts = shape();
    if (pts.length === 0) return PAD;
    const at = (marker?.value ?? 1) * (pts.length - 1);
    const i = Math.floor(at);
    const next = Math.min(pts.length - 1, i + 1);
    return pts[i]! + (pts[next]! - pts[i]!) * (at - i);
  }

  const markerLineProps = useAnimatedProps(() => {
    const x = (marker?.value ?? 1) * width;
    return { x1: x, x2: x, y1: 0, y2: height };
  });

  const markerDotProps = useAnimatedProps(() => ({
    cx: (marker?.value ?? 1) * width,
    cy: markerY(),
  }));

  const containerStyle = useAnimatedStyle(() => ({ opacity: dimmed ? 0.4 : 1 }));

  const endY = ys.length > 0 ? PAD + (1 - ys[ys.length - 1]!) * plotHeight : PAD;
  const ghostEndY =
    ghostYs.length > 0 ? PAD + (1 - ghostYs[ghostYs.length - 1]!) * plotHeight : PAD;

  return (
    <Animated.View
      style={containerStyle}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      // The figures beside it carry the meaning; a curve read aloud point by point does
      // not help anyone.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={{ height }}>
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

            {ghostYs.length > 0 ? (
              <AnimatedPath
                animatedProps={ghostProps}
                stroke={color.ghost}
                strokeWidth={1.8}
                strokeDasharray="3 3"
                fill="none"
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

            {marker ? (
              <>
                <AnimatedLine
                  animatedProps={markerLineProps}
                  stroke={color.lineGreen}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <AnimatedCircle animatedProps={markerDotProps} r={8} fill={color.green} opacity={0.18} />
                <AnimatedCircle animatedProps={markerDotProps} r={4} fill={color.green} />
              </>
            ) : null}

            {ghostYs.length > 0 ? (
              <Circle cx={width} cy={ghostEndY} r={3.5} fill={color.ghost} />
            ) : null}
            {!marker ? <Circle cx={width} cy={endY} r={4} fill={color.green} /> : null}
          </Svg>
        ) : null}
      </View>

      {labels?.primary || labels?.ghost ? (
        <View style={styles.seriesLabels}>
          {labels.primary ? (
            <Text style={[type.leverCaption, textReset, styles.primaryLabel]}>{labels.primary}</Text>
          ) : null}
          {labels.ghost ? (
            <Text style={[type.leverCaption, textReset, { color: color.grey2 }]}>{labels.ghost}</Text>
          ) : null}
        </View>
      ) : null}

      {labels?.left || labels?.right ? (
        <View style={styles.axis}>
          <Text style={[type.disclaimer, textReset]}>{labels.left}</Text>
          <Text style={[type.disclaimer, textReset]}>{labels.right}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  seriesLabels: { flexDirection: 'row', gap: 14, marginTop: 8 },
  primaryLabel: { color: color.green, fontWeight: '700' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});

export const ProjectionChart = memo(ProjectionChartBase);
