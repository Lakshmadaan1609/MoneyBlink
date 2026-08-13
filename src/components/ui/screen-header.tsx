import type { Href } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Logo } from '@/components/brand/logo';
import { BackButton } from '@/components/ui/back-button';
import { StepProgress } from '@/components/ui/step-progress';
import { Spacing } from '@/theme';

type ScreenHeaderProps = {
  /** Zero-based onboarding step. Omit outside the sign-up flow. */
  step?: number;
  /** Custom back behaviour — see BackButton. */
  onBack?: () => void;
  /** Destination when there is no history to pop. */
  backFallback?: Href;
  /** Suppresses back on the entry screen, where there is nothing behind. */
  showBack?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The bar every screen starts with: back on the left, brand in the middle, progress on
 * the right. Kept in one place so the back affordance is guaranteed identical — and
 * present — on every step rather than re-declared four times.
 */
function ScreenHeaderBase({
  step,
  onBack,
  backFallback,
  showBack = true,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {showBack ? <BackButton onPress={onBack} fallback={backFallback} /> : null}
      <Logo size={26} />
      {step === undefined ? null : <StepProgress step={step} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBlockStart: Spacing.four,
  },
});

export const ScreenHeader = memo(ScreenHeaderBase);
