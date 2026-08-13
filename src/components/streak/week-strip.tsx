import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CheckIcon } from '@/components/brand/icons';
import { ThemedText } from '@/components/themed-text';
import { startOfWeek } from '@/domain/simulation';
import type { Contribution } from '@/domain/types';
import { Palette, Radius, Spacing, withAlpha } from '@/theme';

/** Monday-first, matching how an Indian week is read. */
const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

type WeekStripProps = {
  contributions: readonly Contribution[];
  /** Today's local day index. */
  today: number;
};

type DayState = 'done' | 'missed' | 'today' | 'future';

/**
 * This week at a glance.
 *
 * Shows the calendar week rather than a rolling last-seven-days, because a streak is a
 * calendar-day idea and a Monday-to-Sunday row is what people actually picture when
 * they ask "how am I doing this week?".
 *
 * Days ahead of today are drawn as neutral outlines, never as misses. Marking Thursday
 * as failed on Tuesday morning would be both wrong and demoralising.
 */
function WeekStripBase({ contributions, today }: WeekStripProps) {
  const monday = startOfWeek(today);

  // A set, not a scan per cell: with a year of contributions this runs seven lookups
  // instead of seven full passes.
  const days = useMemo(() => {
    const filled = new Set<number>();
    for (const c of contributions) filled.add(c.day);

    return LABELS.map((label, offset) => {
      const day = monday + offset;
      const state: DayState =
        filled.has(day)
          ? 'done'
          : day > today
            ? 'future'
            : day === today
              ? 'today'
              : 'missed';
      return { key: `${day}`, label, state };
    });
  }, [contributions, monday, today]);

  return (
    <View style={styles.row} accessibilityRole="summary" accessibilityLabel="This week">
      {days.map(({ key, label, state }, index) => (
        <View key={key} style={styles.cell}>
          <ThemedText
            type="caption"
            themeColor={state === 'today' ? 'brand' : 'textTertiary'}>
            {label}
          </ThemedText>

          <Animated.View
            entering={FadeIn.delay(index * 45).duration(260)}
            style={[styles.dot, styles[state]]}>
            {state === 'done' ? <CheckIcon size={16} color={Palette.brandDeep} active /> : null}
          </Animated.View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'center', gap: Spacing.two },
  dot: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  done: { backgroundColor: Palette.brand, borderColor: Palette.brand },
  // Today is still winnable, so it is outlined in brand rather than marked either way.
  today: { backgroundColor: withAlpha(Palette.brand, 0.1), borderColor: Palette.brand },
  missed: { backgroundColor: 'transparent', borderColor: Palette.bgElevated },
  future: { backgroundColor: 'transparent', borderColor: Palette.border },
});

export const WeekStrip = memo(WeekStripBase);
