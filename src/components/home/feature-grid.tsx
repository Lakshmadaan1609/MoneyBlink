import { router, type Href } from 'expo-router';
import { memo, type ComponentType } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import {
  BorrowIcon,
  FutureIcon,
  GiftIcon,
  InvestIcon,
  StoryIcon,
  StreakIcon,
  type IconProps,
} from '@/components/brand/icons';
import { ThemedText } from '@/components/themed-text';
import { BORROW_RATE, MIN_DAILY_AMOUNT } from '@/domain/simulation';
import { formatINR, formatPercent } from '@/lib/format';
import { Accent, Layout, Palette, Radius, Spacing, withAlpha } from '@/theme';

type Feature = {
  key: string;
  icon: ComponentType<IconProps>;
  /** Badge tint. Kept to palette values so the grid never invents a colour. */
  color: string;
  title: string;
  copy: string;
  href: Href;
};

/**
 * What this app actually does.
 *
 * Written as data so the list stays honest: a feature belongs here only once it has a
 * destination to send you to. Nothing is described that cannot be reached from the card
 * describing it, which is also what keeps this a navigation surface rather than a poster.
 */
const FEATURES: Feature[] = [
  {
    key: 'streak',
    icon: StreakIcon,
    color: Palette.brand,
    title: 'Wealth Streak',
    copy: `Invest from ${formatINR(MIN_DAILY_AMOUNT)}/day. Shields cover one missed day.`,
    href: '/streak',
  },
  {
    key: 'time-machine',
    icon: InvestIcon,
    color: Accent.safety,
    title: 'Time Machine',
    copy: 'Drag through the years and watch one decision move all of them.',
    href: '/(app)/invest/time-machine',
  },
  {
    key: 'borrow',
    icon: BorrowIcon,
    color: Palette.gold,
    title: 'Borrow, don’t break',
    copy: `Cash at ${formatPercent(BORROW_RATE * 100)} p.a. without selling. It keeps compounding.`,
    href: '/(app)/borrow',
  },
  {
    key: 'future',
    icon: FutureIcon,
    color: Palette.brandDecorative,
    title: 'Future You',
    copy: 'A character who reacts to every decision you make.',
    href: '/(app)/future',
  },
  {
    key: 'rewards',
    icon: GiftIcon,
    color: Accent.streak,
    title: 'Refer & earn',
    copy: 'Share your streak, not a code. You both get paid.',
    href: '/(app)/rewards',
  },
  {
    key: 'story',
    icon: StoryIcon,
    color: Palette.goldSoft,
    title: 'Your why',
    copy: 'Chapter 1 — revisit who you’re building this for.',
    href: '/(story)/meeting',
  },
];

/**
 * The Features grid.
 *
 * Two columns sized from the window rather than percentage widths, because a percentage
 * plus a gap overflows on narrow screens and silently wraps to one card per row.
 */
function FeatureGridBase() {
  const { width } = useWindowDimensions();
  const available = Math.min(width, Layout.maxContentWidth) - Layout.screenPadding * 2;
  const cardWidth = (available - Spacing.three) / 2;

  return (
    <View>
      <ThemedText type="title">Features</ThemedText>

      <View style={styles.grid}>
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.key} feature={feature} width={cardWidth} />
        ))}
      </View>
    </View>
  );
}

function FeatureCard({ feature, width }: { feature: Feature; width: number }) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(1 - pressed.value * 0.03, { damping: 18, stiffness: 260 }) },
    ],
  }));

  const Icon = feature.icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${feature.title}. ${feature.copy}`}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      // `navigate`, not `push`: these point at tabs, and pushing would stack a second
      // copy of a tab on top of the one already mounted.
      onPress={() => router.navigate(feature.href)}>
      <Animated.View style={[styles.card, { width }, animatedStyle]}>
        <View style={[styles.badge, { backgroundColor: withAlpha(feature.color, 0.14) }]}>
          <Icon size={22} color={feature.color} />
        </View>

        <ThemedText type="bodyBold" style={styles.cardTitle}>
          {feature.title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {feature.copy}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBlockStart: Spacing.four,
  },
  card: {
    // Equal minimum height keeps the two columns level when one caption runs a line
    // longer than its neighbour.
    minHeight: 172,
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { marginBlockStart: Spacing.three, marginBlockEnd: Spacing.one },
});

export const FeatureGrid = memo(FeatureGridBase);
