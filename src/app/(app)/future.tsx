import { router } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import {
  InvestIcon,
  ShieldIcon,
  StoryIcon,
  TrophyIcon,
  type IconProps,
} from '@/components/brand/icons';
import { FeedRow } from '@/components/future/feed-row';
import { FutureHero } from '@/components/future/future-hero';
import { useAvatarState } from '@/components/future-self/use-avatar-state';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { buildFeed, type FeedItemKey } from '@/domain/feed';
import { MIN_DAILY_AMOUNT, project } from '@/domain/simulation';
import { CHAPTER_ONE } from '@/domain/story';
import { hasContributedToday, isAtRisk } from '@/domain/streak';
import { firstName } from '@/domain/validation';
import { formatCompactINR, pluralDays } from '@/lib/format';
import { actions, select, useFuture } from '@/store/future-store';
import { Accent, Palette, Radius, Spacing } from '@/theme';

const HORIZONS = [1, 3, 5, 10, 20] as const;

/** Icon and tint per feed category, kept out of the domain so it stays presentation. */
const PRESENTATION: Record<FeedItemKey, { icon: ComponentType<IconProps>; color: string }> = {
  growth: { icon: InvestIcon, color: Accent.growth },
  streak: { icon: TrophyIcon, color: Accent.streak },
  goal: { icon: StoryIcon, color: Accent.goal },
  safety: { icon: ShieldIcon, color: Accent.safety },
};

/** Where each row's action jumps to. */
const DESTINATIONS: Record<FeedItemKey, Parameters<typeof router.navigate>[0]> = {
  growth: '/(app)/invest',
  streak: '/streak',
  goal: '/(app)/future',
  safety: '/(app)/borrow',
};

/**
 * Future Feed.
 *
 * The other tabs are about money. This one answers "what changed in my future today?",
 * which is a different question and needs a different shape — a person at the top
 * reporting their own standing, then the day's movements underneath.
 *
 * Every line here is computed in `@/domain/feed` rather than assembled in JSX, so the
 * copy and the arithmetic cannot drift apart.
 */
export default function FutureScreen() {
  const profile = useFuture(select.profile);
  const portfolio = useFuture(select.portfolio);
  const contributions = useFuture(select.contributions);
  const streak = useFuture(select.streak);
  const today = useFuture(select.today);

  const [openRow, setOpenRow] = useState<FeedItemKey | null>(null);

  const daily = profile?.dailyAmount ?? MIN_DAILY_AMOUNT;
  const avatarState = useAvatarState();
  const investedToday = hasContributedToday(streak, today);
  const atRisk = isAtRisk(streak, today);

  const feed = buildFeed({ portfolio, contributions, streak, today, purpose: profile?.purpose });
  const name = profile?.name ? firstName(profile.name) : 'friend';
  const greeting = greetingFor(new Date().getHours());

  const projections = HORIZONS.map((years) => ({
    years,
    value: project(portfolio.value, daily, years),
  }));

  const purpose = profile?.purpose
    ? CHAPTER_ONE.options.find((option) => option.key === profile.purpose)
    : undefined;

  const reset = async () => {
    await actions.reset();
    router.replace('/(onboarding)/phone');
  };

  return (
    // Pull-to-refresh re-reads the session, which is what rolls the day over if the app
    // has been open across midnight.
    <Screen scroll onRefresh={actions.hydrate}>
      <Animated.View entering={FadeIn.duration(360)} style={styles.header}>
        <ThemedText type="display">
          {greeting.text}, {name}! {greeting.emoji}
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
          Here&apos;s what changed in your future today
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.hero}>
        <FutureHero
          gender={profile?.gender ?? 'male'}
          avatarState={avatarState}
          age={profile?.age}
          streakDays={streak.current}
          invested={portfolio.invested}
          lines={voiceLines({
            name,
            investedToday,
            atRisk,
            streakDays: streak.current,
            purpose: purpose?.label,
          })}
        />
      </Animated.View>

      <View style={styles.feed}>
        <ThemedText type="title">Today&apos;s update</ThemedText>

        {feed.map((item, index) => {
          const { icon, color } = PRESENTATION[item.key];
          return (
            <Animated.View
              key={item.key}
              entering={FadeInDown.delay(120 + index * 60).duration(320)}>
              <FeedRow
                item={item}
                icon={icon}
                color={color}
                expanded={openRow === item.key}
                // One row open at a time: four open accordions is a wall of text, and
                // the point of the feed is that it can be scanned.
                onToggle={() => setOpenRow((current) => (current === item.key ? null : item.key))}
                onAction={() => router.navigate(DESTINATIONS[item.key])}
              />
            </Animated.View>
          );
        })}
      </View>

      <Animated.View entering={FadeInDown.delay(380).duration(320)} style={styles.table}>
        <ThemedText type="title">Where this goes</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          At {formatCompactINR(daily)} a day, on top of today&apos;s balance.
        </ThemedText>

        <Card padded={false} style={styles.tableCard}>
          {projections.map((row, index) => (
            <View key={row.years} style={[styles.row, index > 0 && styles.rowDivided]}>
              <ThemedText type="body" themeColor="textSecondary">
                {row.years} {row.years === 1 ? 'year' : 'years'}
              </ThemedText>
              <ThemedText type="bodyBold" themeColor={row.years >= 10 ? 'brand' : 'text'}>
                {formatCompactINR(row.value)}
              </ThemedText>
            </View>
          ))}
        </Card>

        <ThemedText type="caption" themeColor="textTertiary">
          Projected at 15% p.a. Illustrative, not a guarantee.
        </ThemedText>
      </Animated.View>

      <Button
        label="Start over"
        variant="secondary"
        onPress={() => void reset()}
        style={styles.reset}
      />
    </Screen>
  );
}

/** Time-of-day greeting. Local hours, because the user's morning is the device's. */
function greetingFor(hour: number): { text: string; emoji: string } {
  if (hour < 5) return { text: 'Still up', emoji: '🌙' };
  if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
  if (hour < 21) return { text: 'Good evening', emoji: '🌆' };
  return { text: 'Good night', emoji: '🌙' };
}

/**
 * What the character has to say, most situational first.
 *
 * Always more than one, because the card cycles on tap and a card that says the same
 * thing twice is not worth tapping.
 */
function voiceLines({
  name,
  investedToday,
  atRisk,
  streakDays,
  purpose,
}: {
  name: string;
  investedToday: boolean;
  atRisk: boolean;
  streakDays: number;
  purpose?: string;
}): string[] {
  const lines: string[] = [];

  if (investedToday) lines.push('Great job! Your consistency is shaping our future.');
  if (atRisk) lines.push(`Don't stop now, ${name}. One day is all that stands between us.`);
  if (streakDays === 0) lines.push('Every version of us starts with a single day. Start it.');
  if (streakDays >= 30) lines.push(`${pluralDays(streakDays)} straight. I can feel the difference.`);
  if (purpose) lines.push(`I still remember why we started: ${purpose.toLowerCase()}.`);

  lines.push('The money is not the point. The habit that makes it is.');
  lines.push('Borrow if you must. Just never sell what is still growing.');

  return lines;
}

const styles = StyleSheet.create({
  header: { marginBlockStart: Spacing.five },
  subtitle: { marginBlockStart: Spacing.two },
  hero: { marginBlockStart: Spacing.five },
  feed: { marginBlockStart: Spacing.six, gap: Spacing.three },
  table: { marginBlockStart: Spacing.six, gap: Spacing.two },
  tableCard: { paddingHorizontal: Spacing.four, marginBlockStart: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: Palette.border },
  reset: { marginBlock: Spacing.six, borderRadius: Radius.pill },
});
