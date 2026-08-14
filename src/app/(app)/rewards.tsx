import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { CheckIcon, GiftIcon, LockIcon, StreakIcon } from '@/components/brand/icons';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import {
  REFERRAL_TIERS,
  nextTier,
  referralCode,
  shareMessage,
  tierProgress,
  type ReferralTier,
} from '@/domain/referral';
import { firstName } from '@/domain/validation';
import { pluralDays } from '@/lib/format';
import { actions, select, useFuture } from '@/store/future-store';
import { Accent, Palette, Radius, Spacing, withAlpha } from '@/theme';

/**
 * Rewards.
 *
 * The referral loop, pointed at the one thing a user here is actually proud of: the
 * streak. Sharing leads with "I've invested 47 days straight" rather than a code, because
 * the first is something a person says and the second is something an app says.
 *
 * Nothing on this screen invents social proof. The tier count is real persisted state,
 * and the only way it moves is an invite being accepted — simulated here, since there is
 * no backend to fire the webhook.
 */
export default function RewardsScreen() {
  const profile = useFuture(select.profile);
  const auth = useFuture(select.auth);
  const streak = useFuture(select.streak);
  const accepted = useFuture(select.referralsAccepted);
  const mutating = useFuture(select.mutating);
  const apiError = useFuture(select.error);

  const [copied, setCopied] = useState(false);

  const code = referralCode(auth.phone);
  const target = nextTier(accepted);
  const progress = tierProgress(accepted);

  // Left unmemoised on purpose: the React Compiler cannot verify a `useCallback` that
  // closes over `streak.current`, and refuses to compile around one.
  async function share() {
    const message = shareMessage({
      name: profile?.name ? firstName(profile.name) : undefined,
      streakDays: streak.current,
      code,
    });

    try {
      await Share.share({ message });
    } catch {
      // The user dismissed the sheet, or the platform refused it. Neither is an error
      // worth a red banner — they simply did not share.
    }
  }

  function copy() {
    // No clipboard module in the dependency set, so the share sheet is the copy path.
    void Haptics.selectionAsync().catch(() => {});
    setCopied(true);
    void share();
  }

  return (
    <Screen scroll onRefresh={actions.hydrate}>
      <Animated.View entering={FadeIn.duration(360)} style={styles.header}>
        <ThemedText type="display">Rewards</ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
          Share the habit, not the app. Both of you get paid.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(360)}>
        <Card variant="accent" style={styles.streakCard}>
          <View style={styles.streakTop}>
            <View style={[styles.badge, { backgroundColor: withAlpha(Palette.brand, 0.14) }]}>
              <StreakIcon size={22} color={Palette.brand} />
            </View>
            <View style={styles.streakText}>
              <ThemedText type="overline" themeColor="brand">
                Your proof
              </ThemedText>
              <ThemedText type="title">
                {streak.current > 0
                  ? `${pluralDays(streak.current)} unbroken`
                  : 'Your streak starts today'}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="caption" themeColor="textSecondary" style={styles.streakCopy}>
            {streak.current > 0
              ? 'That number is the invitation. Anyone can download an app; almost nobody shows up every day.'
              : 'Invite anyway — but a streak makes the message land. One contribution starts it.'}
          </ThemedText>

          {/* The card first, plain text second: a picture of a 47-day streak persuades
              on its own, and the code rides along in its caption. */}
          <Button
            label="Share my streak card"
            onPress={() => router.push('/share-milestone')}
            haptic="medium"
            style={styles.shareButton}
          />
          <Pressable onPress={() => void share()} hitSlop={8} style={styles.textShare}>
            <ThemedText type="caption" themeColor="textTertiary">
              Or send it as a message
            </ThemedText>
          </Pressable>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.codeBlock}>
        <ThemedText type="caption" themeColor="textSecondary">
          Your invite code
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Invite code ${code.split('').join(' ')}. Tap to share.`}
          onPress={copy}
          style={styles.code}>
          <ThemedText type="display" style={styles.codeText}>
            {code}
          </ThemedText>
          <ThemedText type="smallBold" themeColor="brand">
            {copied ? 'Shared' : 'Share'}
          </ThemedText>
        </Pressable>
      </Animated.View>

      {apiError ? (
        <ErrorState inline error={apiError} onDismiss={actions.clearError} />
      ) : null}

      <Animated.View entering={FadeInDown.delay(180).duration(360)} style={styles.ladder}>
        <View style={styles.ladderHead}>
          <ThemedText type="title">Reward ladder</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {accepted} joined
          </ThemedText>
        </View>

        {target ? (
          <View style={styles.progressBlock}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {target.count - accepted} more to {target.reward}
            </ThemedText>
          </View>
        ) : null}

        {REFERRAL_TIERS.map((tier, index) => (
          <Animated.View
            key={tier.count}
            entering={FadeInDown.delay(220 + index * 60).duration(320)}>
            <TierRow tier={tier} accepted={accepted} />
          </Animated.View>
        ))}
      </Animated.View>

      <Card variant="flat" style={styles.demo}>
        <ThemedText type="overline" themeColor="textTertiary">
          Demo control
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.demoCopy}>
          There is no backend to tell us when an invite is accepted. This fires the same
          event that webhook would, so the ladder can be seen working.
        </ThemedText>
        <Button
          label="Simulate a friend joining"
          variant="secondary"
          onPress={() => void actions.recordReferral()}
          loading={mutating}
          style={styles.demoButton}
        />
      </Card>
    </Screen>
  );
}

function TierRow({ tier, accepted }: { tier: ReferralTier; accepted: number }) {
  const earned = accepted >= tier.count;
  const iconColor = earned ? Accent.goal : Palette.textTertiary;

  return (
    <View style={[styles.tier, earned && styles.tierEarned]}>
      <View style={[styles.badge, { backgroundColor: withAlpha(iconColor, 0.12) }]}>
        <GiftIcon size={22} color={iconColor} />
      </View>

      <View style={styles.tierText}>
        <ThemedText type="bodyBold" themeColor={earned ? 'text' : 'textSecondary'}>
          {tier.title}
        </ThemedText>
        <ThemedText type="caption" themeColor={earned ? 'gold' : 'textTertiary'}>
          {tier.reward}
        </ThemedText>
      </View>

      {earned ? (
        <View style={styles.earnedPill}>
          <CheckIcon size={14} color={Palette.brandDeep} active />
        </View>
      ) : (
        <LockIcon size={20} color={Palette.textTertiary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBlockStart: Spacing.five },
  subtitle: { marginBlockStart: Spacing.two },
  streakCard: { marginBlockStart: Spacing.five },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  streakText: { flex: 1, gap: 2 },
  streakCopy: { marginBlockStart: Spacing.three },
  shareButton: { marginBlockStart: Spacing.four },
  textShare: { alignSelf: 'center', marginBlockStart: Spacing.three },
  badge: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  codeBlock: { marginBlockStart: Spacing.five, gap: Spacing.two },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.bgElevated,
    backgroundColor: Palette.bgCard,
  },
  // Wide tracking so the code can be read aloud a character at a time.
  codeText: { letterSpacing: 4 },

  ladder: { marginBlockStart: Spacing.six, gap: Spacing.three },
  ladderHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  progressBlock: { gap: Spacing.two },
  track: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.bgElevated,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: Radius.pill, backgroundColor: Palette.brand },

  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
  },
  tierEarned: { borderColor: withAlpha(Palette.brand, 0.4) },
  tierText: { flex: 1, gap: 2 },
  earnedPill: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brand,
  },

  demo: { marginBlock: Spacing.six },
  demoCopy: { marginBlockStart: Spacing.two },
  demoButton: { marginBlockStart: Spacing.three },
});
