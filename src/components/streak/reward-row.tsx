import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { GiftIcon, LockIcon } from '@/components/brand/icons';
import { ThemedText } from '@/components/themed-text';
import type { Reward, RewardStatus } from '@/domain/streak';
import { Palette, Radius, Spacing, withAlpha } from '@/theme';

type RewardRowProps = {
  reward: Reward;
  status: RewardStatus;
  /** Days completed toward this reward. Only read when the reward is active. */
  current: number;
};

/**
 * One rung of the reward ladder.
 *
 * The three states are visually distinct at a glance rather than by reading: earned is
 * gold and confirmed, active carries a live counter and a progress bar, locked is
 * desaturated with a padlock. A user should be able to tell where they are without
 * parsing a single word.
 */
function RewardRowBase({ reward, status, current }: RewardRowProps) {
  const locked = status === 'locked';
  const iconColor = locked ? Palette.textTertiary : Palette.gold;
  const progress = Math.max(0, Math.min(1, current / reward.day));

  return (
    <View
      style={[styles.row, status === 'active' && styles.rowActive]}
      accessibilityRole="summary"
      accessibilityLabel={`${reward.day} day streak, ${reward.label}, ${
        status === 'claimed'
          ? 'claimed'
          : status === 'active'
            ? `${Math.min(current, reward.day)} of ${reward.day} days`
            : 'locked'
      }`}>
      <View style={styles.main}>
        <View style={[styles.badge, { backgroundColor: withAlpha(iconColor, 0.12) }]}>
          <GiftIcon size={26} color={iconColor} />
        </View>

        <View style={styles.text}>
          <ThemedText type="bodyBold" themeColor={locked ? 'textSecondary' : 'text'}>
            {reward.day} Day Streak
          </ThemedText>
          <ThemedText
            type="caption"
            themeColor={locked ? 'textTertiary' : reward.amount === null ? 'gold' : 'brand'}>
            {reward.label}
          </ThemedText>
        </View>

        {status === 'claimed' ? (
          <View style={styles.claimed}>
            <ThemedText type="smallBold" themeColor="brand">
              CLAIMED
            </ThemedText>
          </View>
        ) : status === 'active' ? (
          <ThemedText type="bodyBold" themeColor="brand">
            {Math.min(current, reward.day)} / {reward.day}
          </ThemedText>
        ) : (
          <LockIcon size={22} color={Palette.textTertiary} />
        )}
      </View>

      {status === 'active' ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
    gap: Spacing.three,
  },
  rowActive: { borderColor: withAlpha(Palette.brand, 0.45) },
  main: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  badge: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  claimed: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: withAlpha(Palette.brand, 0.14),
  },
  track: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.bgElevated,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: Radius.pill, backgroundColor: Palette.brand },
});

export const RewardRow = memo(RewardRowBase);
