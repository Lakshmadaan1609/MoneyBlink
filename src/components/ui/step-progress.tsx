import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Palette, Radius, Spacing } from '@/theme';

type StepProgressProps = {
  /** Zero-based index of the current step. */
  step: number;
  total?: number;
};

/**
 * Sign-up progress.
 *
 * The active step widens into a bar while completed steps stay filled dots, so the user
 * can see both where they are and how much is left. Three steps is short enough that
 * showing the whole path reassures rather than intimidates.
 */
function StepProgressBase({ step, total = 3 }: StepProgressProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step + 1 }}
      accessibilityLabel={`Step ${step + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <Dot key={i} active={i === step} done={i < step} />
      ))}
    </View>
  );
}

const Dot = memo(function Dot({ active, done }: { active: boolean; done: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 22 : 6, { duration: 260 }),
    backgroundColor: withTiming(active || done ? Palette.brand : Palette.bgElevated, {
      duration: 260,
    }),
  }));

  return <Animated.View style={[styles.dot, style]} />;
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  dot: { height: 6, borderRadius: Radius.pill },
});

export const StepProgress = memo(StepProgressBase);
