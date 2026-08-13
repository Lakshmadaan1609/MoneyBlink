import { memo, useEffect } from 'react';
import { StyleSheet, TextInput, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Colors, Typography, type ThemeColor } from '@/theme';

/**
 * Indian digit grouping, as a worklet.
 *
 * Duplicated from `@/lib/format` rather than imported because this runs on the UI
 * thread, where a normal JS function cannot be called. Written without regex so it
 * stays safe inside the Reanimated runtime. `tests/domain.test.ts` covers the JS twin,
 * and the two are asserted to agree.
 */
function groupIndianWorklet(value: number): string {
  'worklet';
  const negative = value < 0;
  const digits = String(Math.abs(Math.round(value)));

  let grouped = digits;
  if (digits.length > 3) {
    const last3 = digits.slice(-3);
    let rest = digits.slice(0, -3);
    let pairs = '';
    while (rest.length > 2) {
      pairs = ',' + rest.slice(-2) + pairs;
      rest = rest.slice(0, -2);
    }
    grouped = rest + pairs + ',' + last3;
  }

  return (negative ? '-' : '') + grouped;
}

/** Compact lakh/crore scale, as a worklet. Mirrors `formatCompactINR`. */
function compactWorklet(value: number): string {
  'worklet';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e7) {
    const n = abs / 1e7;
    return sign + '₹' + (n >= 100 ? String(Math.round(n)) : n.toFixed(n >= 10 ? 1 : 2)) + ' Cr';
  }
  if (abs >= 1e5) {
    const n = abs / 1e5;
    return sign + '₹' + (n >= 100 ? String(Math.round(n)) : n.toFixed(n >= 10 ? 1 : 2)) + ' L';
  }
  return sign + '₹' + groupIndianWorklet(abs);
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type AnimatedNumberProps = {
  value: number;
  /** `compact` switches to lakh/crore past ₹1L so hero figures never wrap. */
  mode?: 'full' | 'compact' | 'plain';
  variant?: keyof typeof Typography;
  themeColor?: ThemeColor;
  duration?: number;
  style?: TextStyle;
};

/**
 * A number that counts to its new value.
 *
 * Rendered through a read-only `TextInput` because its `text` prop can be driven
 * straight from `useAnimatedProps` — the digits update on the UI thread without a
 * single React re-render. A `<Text>` would need one render per frame, which is exactly
 * what makes naive counters stutter while the slider is being dragged.
 */
function AnimatedNumberBase({
  value,
  mode = 'full',
  variant = 'displayLarge',
  themeColor = 'text',
  duration = 420,
  style,
}: AnimatedNumberProps) {
  const progress = useSharedValue(value);

  useEffect(() => {
    progress.value = withTiming(value, {
      duration,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [duration, progress, value]);

  const animatedProps = useAnimatedProps(() => {
    const current = progress.value;
    const text =
      mode === 'compact'
        ? compactWorklet(current)
        : mode === 'plain'
          ? groupIndianWorklet(current)
          : '₹' + groupIndianWorklet(current);
    // `defaultValue` is what actually lands on the native node; `text` keeps the
    // managed value in sync so the two never diverge mid-animation.
    return { text, defaultValue: text };
  });

  return (
    <AnimatedTextInput
      editable={false}
      // Android draws its own baseline and padding on TextInput; both must go or the
      // number sits visibly lower than adjacent Text.
      underlineColorAndroid="transparent"
      pointerEvents="none"
      accessibilityRole="text"
      style={[
        styles.reset,
        Typography[variant] as TextStyle,
        { color: Colors[themeColor] },
        style,
      ]}
      // No `value` prop: a React-controlled value would win over `animatedProps` and
      // render the raw unformatted float. The animated props are the only writer.
      animatedProps={animatedProps}
      numberOfLines={1}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  reset: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
    textAlign: 'left',
    includeFontPadding: false,
  },
});

export const AnimatedNumber = memo(AnimatedNumberBase);
