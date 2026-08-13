import { memo, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { AssumedRate } from '@/store/time-machine';
import { color, radius, textReset, tint, type } from '@/theme/tokens';

/* ------------------------------------------------------------------ *
 * PrimaryButton
 * ------------------------------------------------------------------ */

type ButtonVariant = 'solid' | 'ghost' | 'quiet';

/**
 * The feature's only button.
 *
 * Copy is always specific — "Confirm ₹200 / day", never "Submit" — so the label alone
 * tells the user what they are agreeing to without re-reading the sheet above it.
 */
export const PrimaryButton = memo(function PrimaryButton({
  label,
  onPress,
  variant = 'solid',
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}) {
  const pressed = useSharedValue(0);
  const inert = Boolean(loading || disabled);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.02, { damping: 20, stiffness: 300 }) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: Boolean(loading) }}
      disabled={inert}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      onPress={onPress}>
      <Animated.View
        style={[
          styles.button,
          variant === 'solid' && styles.solid,
          variant === 'ghost' && styles.ghost,
          variant === 'quiet' && styles.quiet,
          inert && styles.inert,
          animatedStyle,
        ]}>
        {loading ? (
          <ActivityIndicator size="small" color={variant === 'solid' ? color.ctaText : color.grey} />
        ) : (
          <Text
            style={[
              variant === 'solid' ? type.cta : type.ctaQuiet,
              textReset,
              variant === 'ghost' && { color: color.white },
            ]}>
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
});

/* ------------------------------------------------------------------ *
 * AssumptionPills
 * ------------------------------------------------------------------ */

const RATES: AssumedRate[] = [8, 12, 15];

/**
 * The return assumption, always visible and always changeable.
 *
 * This is not a settings detail. A projection shown under a rate the user cannot see or
 * alter reads as a forecast; one they picked themselves reads as the arithmetic it is.
 */
export const AssumptionPills = memo(function AssumptionPills({
  value,
  onChange,
}: {
  value: AssumedRate;
  onChange: (rate: AssumedRate) => void;
}) {
  return (
    <View style={styles.pillRow} accessibilityRole="radiogroup" accessibilityLabel="Assumed annual return">
      {RATES.map((rate) => {
        const active = rate === value;
        return (
          <Pressable
            key={rate}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${rate} percent a year`}
            onPress={() => onChange(rate)}
            style={[styles.pill, active && styles.pillActive]}>
            <Text style={[active ? type.pillActive : type.pill, textReset]}>{rate}%</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

/* ------------------------------------------------------------------ *
 * LeverRow
 * ------------------------------------------------------------------ */

/**
 * One "what if".
 *
 * Downside levers carry identical visual weight to the upside one — same height, same
 * border, same type. Only the delta's colour differs. Shrinking the ones that hurt would
 * be the app choosing what the user is allowed to consider.
 */
export const LeverRow = memo(function LeverRow({
  title,
  caption,
  delta,
  variant,
  active,
  onPress,
  index = 0,
}: {
  title: string;
  caption: string;
  delta: string;
  variant: 'positive' | 'negative';
  active: boolean;
  onPress: () => void;
  index?: number;
}) {
  const pressed = useSharedValue(0);
  const reduced = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.015, { damping: 20, stiffness: 300 }) }],
  }));

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.delay(index * 80).duration(320)}
      style={animatedStyle}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${title}. ${caption}. ${
          variant === 'positive' ? 'Gains' : 'Costs'
        } ${delta.replace(/^[+−-]/, '')} by the selected year.`}
        onPressIn={() => {
          pressed.value = 1;
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
        onPress={onPress}
        style={[styles.lever, active && styles.leverActive]}>
        <View style={styles.leverText}>
          <Text style={[type.leverTitle, textReset, active && { color: color.green }]}>{title}</Text>
          <Text style={[type.leverCaption, textReset]}>{caption}</Text>
        </View>
        <Text
          style={[
            type.leverDelta,
            textReset,
            variant === 'negative' && { color: color.red },
          ]}>
          {delta}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

/* ------------------------------------------------------------------ *
 * Segmented
 * ------------------------------------------------------------------ */

/** Full-width two-up switch between the single and two-future views. */
export const Segmented = memo(function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.key)}
            style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[active ? type.pillActive : type.pill, textReset]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

/** Wraps a screen's scroll body so every screen shares one gutter. */
export const Stack = memo(function Stack({ children, gap = 15 }: { children: ReactNode; gap?: number }) {
  return <View style={{ gap }}>{children}</View>;
});

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  solid: { backgroundColor: color.green },
  ghost: { borderWidth: 1, borderColor: color.line, backgroundColor: 'transparent' },
  quiet: { backgroundColor: 'transparent' },
  inert: { opacity: 0.45 },

  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    minHeight: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  pillActive: { borderColor: color.lineGreen, backgroundColor: tint.greenPillBg },

  lever: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: radius.lever,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.card,
  },
  leverActive: { borderColor: color.green, backgroundColor: tint.greenCardTop },
  leverText: { flex: 1, gap: 3 },

  segmented: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  segmentActive: { borderColor: color.lineGreen, backgroundColor: tint.greenPillBg },
});
