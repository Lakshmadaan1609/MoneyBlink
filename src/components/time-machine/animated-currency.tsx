import { memo, useEffect } from 'react';
import { StyleSheet, TextInput, View, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { compactWorklet, rupeeWorklet } from '@/lib/format-worklets';
import { textReset } from '@/theme/tokens';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type AnimatedCurrencyProps = {
  /**
   * A number animates to its new value on change. A shared value is read straight off
   * the UI thread — that is the form the scrubber uses, so the hero tracks the drag
   * without a single React render.
   */
  value: number | SharedValue<number>;
  format?: 'full' | 'compact';
  style?: TextStyle | TextStyle[];
  duration?: number;
  /**
   * What a screen reader announces. The live digits are useless to TalkBack mid-count,
   * so callers pass the settled value with its meaning attached.
   */
  label?: string;
};

/**
 * A currency figure that counts to its value.
 *
 * Rendered through a read-only `TextInput` because its `text` prop can be driven from
 * `useAnimatedProps` — the digits update on the UI thread with no React render per
 * frame, which is the difference between a smooth scrub and a stuttering one.
 */
function AnimatedCurrencyBase({
  value,
  format = 'full',
  style,
  duration = 420,
  label,
}: AnimatedCurrencyProps) {
  const reduced = useReducedMotion();
  const isShared = typeof value !== 'number';
  const local = useSharedValue(typeof value === 'number' ? value : 0);

  useEffect(() => {
    if (typeof value !== 'number') return;
    local.value = reduced
      ? value
      : withTiming(value, { duration, easing: Easing.bezier(0.4, 0, 0.2, 1) });
  }, [duration, local, reduced, value]);

  const animatedProps = useAnimatedProps(() => {
    const current = isShared ? (value as SharedValue<number>).value : local.value;
    const text = format === 'compact' ? compactWorklet(current) : rupeeWorklet(current);
    // `defaultValue` is what lands on the native node; `text` keeps the managed value in
    // step so the two cannot diverge mid-count.
    return { text, defaultValue: text };
  });

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={label}>
      <AnimatedTextInput
        editable={false}
        underlineColorAndroid="transparent"
        pointerEvents="none"
        // The label above carries the meaning; the raw digits would be read twice.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.reset, textReset, style]}
        // No `value` prop: a React-controlled value outranks `animatedProps` and would
        // render the raw unformatted float.
        animatedProps={animatedProps}
        numberOfLines={1}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  reset: { padding: 0, margin: 0, borderWidth: 0, textAlign: 'left' },
});

export const AnimatedCurrency = memo(AnimatedCurrencyBase);
