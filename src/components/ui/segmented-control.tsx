import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Layout, Palette, Radius, Spacing } from '@/theme';

/** Gap between the track's border and the sliding thumb. */
const INSET = Spacing.half + 2;
const BORDER = 1.5;

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  label: string;
  options: Option<T>[];
  /** Null means nothing has been chosen yet — the thumb stays hidden. */
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
  hint?: string;
  containerStyle?: ViewStyle;
};

/**
 * A two-or-more way choice as a sliding pill.
 *
 * Every option is visible at once and the thumb slides between them, so the control
 * shows both what is selected and what else is available — unlike a dropdown, which
 * hides the alternatives, or a pair of cards, which costs half a screen.
 *
 * Nothing is selected by default. A pre-filled thumb would record an answer the user
 * never gave, which for something like gender is worse than asking twice.
 */
function SegmentedControlBase<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  hint,
  containerStyle,
}: SegmentedControlProps<T>) {
  const [trackWidth, setTrackWidth] = useState(0);

  const index = options.findIndex((option) => option.value === value);
  const segmentWidth = trackWidth
    ? (trackWidth - BORDER * 2 - INSET * 2) / options.length
    : 0;

  const position = useSharedValue(Math.max(0, index));
  const invalid = useSharedValue(0);

  useEffect(() => {
    if (index < 0) return;
    position.value = withSpring(index, { damping: 18, stiffness: 220 });
  }, [index, position]);

  useEffect(() => {
    invalid.value = withTiming(error ? 1 : 0, { duration: 160 });
  }, [error, invalid]);

  const select = useCallback(
    (next: T) => {
      if (next === value) return;
      // A physical tick makes the thumb's travel feel like a switch rather than a repaint.
      void Haptics.selectionAsync().catch(() => {});
      onChange(next);
    },
    [onChange, value],
  );

  const thumbStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: position.value * segmentWidth }],
    // Hidden until a choice exists, so an unanswered control never looks answered.
    opacity: withTiming(index < 0 ? 0 : 1, { duration: 180 }),
  }));

  return (
    <View style={containerStyle}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>

      <View
        style={[styles.track, error ? styles.trackInvalid : null]}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}>
        <Animated.View style={[styles.thumb, thumbStyle]} pointerEvents="none" />

        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              style={styles.segment}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => select(option.value)}>
              <ThemedText
                type="bodyBold"
                themeColor={selected ? 'textOnAccent' : 'textSecondary'}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <ThemedText type="caption" themeColor="error" style={styles.helper}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="caption" themeColor="textTertiary" style={styles.helper}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Matches TextField exactly, so the two read as one form rather than two widgets.
  track: {
    flexDirection: 'row',
    minHeight: Layout.minTouchTarget + 8,
    marginBlockStart: Spacing.two,
    padding: INSET,
    borderRadius: Radius.lg,
    borderWidth: BORDER,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
  },
  trackInvalid: { borderColor: Palette.error },
  thumb: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: INSET,
    borderRadius: Radius.md,
    backgroundColor: Palette.brand,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the tap target full-height even though the thumb is inset.
    paddingVertical: Spacing.two,
  },
  helper: { marginBlockStart: Spacing.one },
});

/**
 * `memo` erases the generic, so the signature is restated. The component is a pure
 * function of its props, which is exactly what memo needs.
 */
export const SegmentedControl = memo(SegmentedControlBase) as <T extends string>(
  props: SegmentedControlProps<T>,
) => ReactElement;
