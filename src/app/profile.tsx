import { Stack, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { FutureAvatar } from '@/components/future-self/future-avatar';
import { useAvatarState } from '@/components/future-self/use-avatar-state';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { bindingConstraint, nextStage, stageFor, stageProgress } from '@/domain/evolution';
import { referralCode } from '@/domain/referral';
import { dateFromDayIndex } from '@/domain/simulation';
import { CHAPTER_ONE } from '@/domain/story';
import { MAX_SHIELDS } from '@/domain/streak';
import { formatINR, pluralDays } from '@/lib/format';
import { select, useFuture } from '@/store/future-store';
import { Layout, Palette, Radius, Spacing, withAlpha } from '@/theme';

/**
 * My Profile.
 *
 * A read-only account summary. Everything here already exists somewhere in the product —
 * the point of the screen is that it exists in *one* place, so a user can answer "what
 * does this app actually know about me?" without touring five tabs.
 */
export default function ProfileScreen() {
  const profile = useFuture(select.profile);
  const auth = useFuture(select.auth);
  const streak = useFuture(select.streak);
  const portfolio = useFuture(select.portfolio);
  const referrals = useFuture(select.referralsAccepted);
  const avatarState = useAvatarState();

  const stage = stageFor(streak.current, portfolio.invested);
  const next = nextStage(stage);
  const progress = stageProgress(streak.current, portfolio.invested);
  const blocker = bindingConstraint(streak.current, portfolio.invested);

  const purpose = profile?.purpose
    ? CHAPTER_ONE.options.find((option) => option.key === profile.purpose)
    : undefined;

  const since = profile?.startedDay
    ? dateFromDayIndex(profile.startedDay).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <Screen scroll>
      <Stack.Screen options={{ animation: 'slide_from_right' }} />

      <View style={styles.header}>
        <BackButton fallback="/(app)/home" />
        <ThemedText type="title" numberOfLines={1} style={styles.title}>
          My Profile
        </ThemedText>
        <View style={styles.spacer} />
      </View>

      <Animated.View entering={FadeIn.duration(360)} style={styles.hero}>
        <FutureAvatar
          gender={profile?.gender ?? 'male'}
          state={avatarState}
          size={128}
          framed={false}
        />
        <ThemedText type="display" style={styles.name}>
          {profile?.name ?? 'Your profile'}
        </ThemedText>

        <View style={styles.dna}>
          <ThemedText type="smallBold" themeColor="brand">
            {stage.dna}
          </ThemedText>
        </View>

        <ThemedText type="caption" themeColor="textSecondary" style={styles.tagline}>
          {stage.tagline}
        </ThemedText>
      </Animated.View>

      {next ? (
        <Animated.View entering={FadeInDown.delay(80).duration(340)} style={styles.progressBlock}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {blocker === 'streak'
              ? `${pluralDays(Math.max(0, next.minStreak - streak.current))} of consistency to ${next.title}`
              : blocker === 'invested'
                ? `${formatINR(Math.max(0, next.minInvested - portfolio.invested))} more to ${next.title}`
                : `Ready for ${next.title}`}
          </ThemedText>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(140).duration(340)} style={styles.section}>
        <ThemedText type="overline" themeColor="textSecondary">
          Account
        </ThemedText>
        <Card style={styles.card}>
          <Row label="Name" value={profile?.name ?? '—'} />
          <Row label="Age" value={profile?.age ? String(profile.age) : '—'} />
          <Row label="Mobile" value={auth.phone ? `+91 ${auth.phone}` : '—'} />
          <Row label="Future You" value={profile?.gender ?? '—'} capitalise />
          <Row label="Member since" value={since} last />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(340)} style={styles.section}>
        <ThemedText type="overline" themeColor="textSecondary">
          Progress
        </ThemedText>
        <Card style={styles.card}>
          <Row label="Current streak" value={pluralDays(streak.current)} />
          <Row label="Longest streak" value={pluralDays(streak.longest)} />
          <Row label="Shields" value={`${streak.shields} of ${MAX_SHIELDS}`} />
          <Row label="Invested" value={formatINR(portfolio.invested)} />
          <Row label="Portfolio value" value={formatINR(portfolio.value)} last />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(260).duration(340)} style={styles.section}>
        <ThemedText type="overline" themeColor="textSecondary">
          Why you started
        </ThemedText>
        <Card variant="accent" style={styles.card}>
          <ThemedText type="bodyBold">{purpose?.label ?? 'Not chosen yet'}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.purposeCopy}>
            {purpose?.caption ?? 'Revisit Chapter 1 to choose who you are building this for.'}
          </ThemedText>
          <Button
            label="Revisit Chapter 1"
            variant="secondary"
            onPress={() => router.push('/(story)/meeting')}
            style={styles.purposeCta}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).duration(340)} style={styles.section}>
        <ThemedText type="overline" themeColor="textSecondary">
          Referrals
        </ThemedText>
        <Card style={styles.card}>
          <Row label="Invite code" value={referralCode(auth.phone)} />
          <Row label="Friends joined" value={String(referrals)} last />
        </Card>
        <Button
          label="Share your streak"
          onPress={() => router.push('/share-milestone')}
          style={styles.shareCta}
        />
      </Animated.View>
    </Screen>
  );
}

function Row({
  label,
  value,
  last,
  capitalise,
}: {
  label: string;
  value: string;
  last?: boolean;
  capitalise?: boolean;
}) {
  return (
    <View
      style={[styles.row, !last && styles.rowDivided]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}, ${value}`}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={[styles.rowValue, capitalise && styles.capitalise]}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBlockStart: Spacing.four,
  },
  title: { flex: 1, textAlign: 'center' },
  // Balances the back button so the title sits optically centred.
  spacer: { width: Layout.minTouchTarget },

  hero: { alignItems: 'center', marginBlockStart: Spacing.four },
  name: { textAlign: 'center', marginBlockStart: Spacing.three },
  dna: {
    marginBlockStart: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: withAlpha(Palette.brand, 0.14),
    borderWidth: 1,
    borderColor: withAlpha(Palette.brand, 0.28),
  },
  tagline: { textAlign: 'center', marginBlockStart: Spacing.three },

  progressBlock: { marginBlockStart: Spacing.five, gap: Spacing.two },
  track: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.bgElevated,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: Radius.pill, backgroundColor: Palette.brand },

  section: { marginBlockStart: Spacing.five, gap: Spacing.three },
  card: { paddingVertical: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowDivided: { borderBottomWidth: 1, borderBottomColor: Palette.border },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  capitalise: { textTransform: 'capitalize' },
  purposeCopy: { marginBlockStart: Spacing.two },
  purposeCta: { marginBlockStart: Spacing.four },
  shareCta: { marginBlockEnd: Spacing.six },
});
