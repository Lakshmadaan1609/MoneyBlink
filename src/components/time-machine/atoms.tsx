import { memo, useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { color, radius, space, textReset, tint, type } from '@/theme/tokens';

/* ------------------------------------------------------------------ *
 * Eyebrow
 * ------------------------------------------------------------------ */

/** The small tracked-out label above a value. Green when it belongs to an accent block. */
export const Eyebrow = memo(function Eyebrow({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'green' | 'amber';
}) {
  return (
    <Text
      style={[
        type.eyebrow,
        textReset,
        tone === 'green' && { color: color.green },
        tone === 'amber' && { color: color.amber },
      ]}
      // Tracked-out uppercase is read letter-by-letter otherwise.
      accessibilityRole="header">
      {children}
    </Text>
  );
});

/* ------------------------------------------------------------------ *
 * Disclaimer
 * ------------------------------------------------------------------ */

/**
 * Appears on every screen that shows a future figure. Not optional, not collapsible: a
 * projection without one is a promise.
 */
export const Disclaimer = memo(function Disclaimer({ children }: { children: ReactNode }) {
  return <Text style={[type.disclaimer, textReset]}>{children}</Text>;
});

/* ------------------------------------------------------------------ *
 * Card + StatCard
 * ------------------------------------------------------------------ */

export const Card = memo(function Card({
  children,
  border = 'line',
  style,
}: {
  children: ReactNode;
  border?: 'line' | 'green' | 'amber' | 'red';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.card,
        border === 'green' && { borderColor: color.lineGreen },
        border === 'amber' && { borderColor: color.lineAmber },
        border === 'red' && { borderColor: color.lineRed },
        style,
      ]}>
      {children}
    </View>
  );
});

export type StatRow = {
  label: string;
  value: string;
  /** Tints the value only — labels stay grey so the eye lands on the number. */
  tone?: 'default' | 'green' | 'red' | 'amber';
  /** Draws a hairline above this row. */
  divided?: boolean;
};

/**
 * A block of label/value pairs.
 *
 * Every row is one accessibility node reading "label, value", because TalkBack landing on
 * a bare "₹52.6L" with the label in a separate node is useless on a money screen.
 */
export const StatCard = memo(function StatCard({
  rows,
  border = 'line',
  header,
  footer,
  style,
}: {
  rows: StatRow[];
  border?: 'line' | 'green' | 'amber' | 'red';
  header?: ReactNode;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card border={border} style={style}>
      {header}
      {rows.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={[styles.kv, row.divided && styles.kvDivided]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${row.label}, ${row.value}`}>
          <Text style={[type.kvKey, textReset]}>{row.label}</Text>
          <Text
            style={[
              type.kvValue,
              textReset,
              row.tone === 'green' && { color: color.green },
              row.tone === 'red' && { color: color.red },
              row.tone === 'amber' && { color: color.amber },
            ]}>
            {row.value}
          </Text>
        </View>
      ))}
      {footer}
    </Card>
  );
});

/* ------------------------------------------------------------------ *
 * Skeleton
 * ------------------------------------------------------------------ */

/**
 * Loading placeholder shaped like the thing it is standing in for.
 *
 * A shimmering block that matches the final layout tells the user what is arriving; a
 * spinner tells them only that something is happening.
 */
export const SkeletonBlock = memo(function SkeletonBlock({
  width,
  height,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  style?: StyleProp<ViewStyle>;
}) {
  const shimmer = useSharedValue(0.35);
  const reduced = useReducedMotion();

  // Must be an effect: writing to a shared value during render mutates state React may
  // discard, and Reanimated warns about exactly this.
  useEffect(() => {
    if (reduced) return;
    shimmer.value = withRepeat(
      withTiming(0.75, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduced, shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.skeleton, { width: width ?? '100%', height }, animatedStyle, style]}
    />
  );
});

/* ------------------------------------------------------------------ *
 * Offline banner
 * ------------------------------------------------------------------ */

export const OfflineBanner = memo(function OfflineBanner() {
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Text style={[type.leverCaption, textReset, { color: color.amber }]}>
        You&apos;re offline — showing your last synced numbers
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.card,
    padding: space.cardPad,
  },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  kvDivided: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.line,
  },
  skeleton: { borderRadius: radius.cta, backgroundColor: color.card },
  banner: {
    borderRadius: radius.cta,
    borderWidth: 1,
    borderColor: color.lineAmber,
    backgroundColor: tint.amberBannerBg,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
});
