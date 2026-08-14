import * as Haptics from 'expo-haptics';
import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Disclaimer, Eyebrow, StatCard } from './atoms';
import { PrimaryButton } from './controls';
import { Sheet } from './sheet';
import { formatCompactINR, formatINR } from '@/lib/format';
import { pick, timeMachine, useTimeMachine } from '@/store/time-machine';
import { color, textReset, type } from '@/theme/tokens';

/** A month of a daily SIP, for the "extra per month" row. */
const DAYS_PER_MONTH = 30;

type CommitSheetProps = {
  visible: boolean;
  currentSip: number;
  nextSip: number;
  /** Difference at the selected year, in rupees. */
  difference: number;
  year: number;
  onDismiss: () => void;
  onCommitted: () => void;
};

/**
 * The one decision.
 *
 * Nothing is confirmed optimistically. The success screen only appears after the mock
 * resolves, because a SIP change that appears to have worked and then quietly failed is
 * the single worst outcome this flow can produce — the user stops thinking about it.
 *
 * One of the feature's two haptics fires here, on the confirm itself. The other is on the
 * success screen. Anything more and the physical feedback stops meaning "this mattered".
 */
function CommitSheetBase({
  visible,
  currentSip,
  nextSip,
  difference,
  year,
  onDismiss,
  onCommitted,
}: CommitSheetProps) {
  const status = useTimeMachine(pick.status);
  const [submitting, setSubmitting] = useState(false);

  const confirm = async () => {
    setSubmitting(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const ok = await timeMachine.commit(nextSip);
      if (ok) onCommitted();
      // A failure leaves the sheet open with the error visible on the screen behind it —
      // dismissing would hide the fact that nothing happened.
    } finally {
      setSubmitting(false);
    }
  };

  const monthly = (nextSip - currentSip) * DAYS_PER_MONTH;

  return (
    <Sheet visible={visible} onDismiss={onDismiss}>
      <View style={styles.head}>
        <Eyebrow>One decision</Eyebrow>
        <Text style={[type.sheetTitle, textReset]}>
          Increase your SIP to {formatINR(nextSip)} a day?
        </Text>
        <Text style={[type.sub, textReset]}>
          Starts tomorrow. Change or stop it any time — nothing is locked.
        </Text>
      </View>

      <StatCard
        rows={[
          { label: 'Today', value: `${formatINR(currentSip)} / day` },
          { label: 'After this', value: `${formatINR(nextSip)} / day`, tone: 'green', divided: true },
          { label: 'Extra per month', value: formatINR(monthly), divided: true },
          {
            label: `${year} difference`,
            value: `${difference >= 0 ? '+' : '−'}${formatCompactINR(Math.abs(difference))}`,
            tone: difference >= 0 ? 'green' : 'red',
            divided: true,
          },
        ]}
      />

      {status === 'error' ? (
        <Text style={[type.leverCaption, textReset, { color: color.red }]}>
          That didn&apos;t go through. Nothing was changed — try again.
        </Text>
      ) : null}

      <PrimaryButton
        label={`Confirm ${formatINR(nextSip)} / day`}
        onPress={() => void confirm()}
        loading={submitting || status === 'committing'}
      />
      <PrimaryButton label="Not now" variant="quiet" onPress={onDismiss} disabled={submitting} />

      <Disclaimer>Figures illustrative. Not a guarantee of returns.</Disclaimer>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { gap: 8 },
});

export const CommitSheet = memo(CommitSheetBase);
