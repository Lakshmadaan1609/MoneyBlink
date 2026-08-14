import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Eyebrow, SkeletonBlock } from './atoms';
import { PrimaryButton } from './controls';
import { color, space, textReset, type } from '@/theme/tokens';

/**
 * Loading.
 *
 * Blocks shaped like the screen that is arriving — hero, sub, chart, card — rather than a
 * spinner. The layout does not shift when the data lands, which is the difference between
 * a screen that loads and a screen that lurches.
 */
export const TimeMachineSkeleton = memo(function TimeMachineSkeleton() {
  return (
    <View style={styles.stack} accessibilityLabel="Loading your projection" accessible>
      <SkeletonBlock width="45%" height={14} />
      <SkeletonBlock width="70%" height={44} />
      <SkeletonBlock width="55%" height={18} />
      <SkeletonBlock height={134} />
      <SkeletonBlock height={44} />
      <SkeletonBlock height={112} />
    </View>
  );
});

/**
 * Empty.
 *
 * Names the floor — ₹21 — because "start investing" without a number leaves the user to
 * guess whether they can afford to.
 */
export const TimeMachineEmpty = memo(function TimeMachineEmpty({
  onStart,
}: {
  onStart: () => void;
}) {
  return (
    <View style={styles.stack}>
      <Text style={[type.sub, textReset]}>
        There&apos;s no future to show yet. Start investing from ₹21 a day and your
        timeline appears here.
      </Text>
      <PrimaryButton label="Start investing" onPress={onStart} />
    </View>
  );
});

/**
 * Error.
 *
 * States what failed and, crucially, that nothing changed. On a money screen the second
 * half is the part the user actually needs; "Something went wrong" leaves them wondering
 * whether their SIP just doubled.
 */
export const TimeMachineError = memo(function TimeMachineError({
  onRetry,
  retrying,
}: {
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <View style={styles.stack}>
      <Card border="red">
        <Text style={[type.sub, textReset, { color: color.white }]}>
          We couldn&apos;t load market data. Your money is safe and nothing was changed.
        </Text>
      </Card>
      <PrimaryButton label="Retry" variant="ghost" onPress={onRetry} loading={retrying} />
    </View>
  );
});

/**
 * Queued.
 *
 * The idempotency key is the reason the last sentence can be promised rather than hoped
 * for — a resend carries the same key, and the server returns the first result instead of
 * booking a second change.
 */
export const QueuedCommitCard = memo(function QueuedCommitCard({
  dailySip,
  savedAt,
}: {
  dailySip: number;
  savedAt: string;
}) {
  const time = new Date(savedAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Card border="amber">
      <Eyebrow tone="amber">Queued</Eyebrow>
      <Text style={[type.sub, textReset, styles.queuedBody]}>
        Your SIP change to ₹{dailySip}/day is saved. We&apos;ll submit it once you&apos;re
        back online — it won&apos;t be sent twice.
      </Text>

      <View style={styles.divider} />

      <View style={styles.kv}>
        <Text style={[type.kvKey, textReset]}>Saved at</Text>
        <Text style={[type.kvValue, textReset]}>{time}</Text>
      </View>
      <View style={[styles.kv, styles.kvSpaced]}>
        <Text style={[type.kvKey, textReset]}>Status</Text>
        <Text style={[type.kvValue, textReset, { color: color.amber }]}>Waiting for network</Text>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  stack: { gap: space.gap },
  queuedBody: { marginTop: 8, color: color.grey },
  divider: { height: 1, backgroundColor: color.line, marginVertical: 13 },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  kvSpaced: { marginTop: 10 },
});
