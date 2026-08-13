import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ErrorState } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { PHONE_LENGTH, digitsOnly, formatPhone, validatePhone } from '@/domain/validation';
import { actions, select, useFuture } from '@/store/future-store';
import { Spacing } from '@/theme';

/**
 * Step 1 — mobile number.
 *
 * Input is restricted to ten digits at the source rather than validated after the fact,
 * so an eleventh digit simply cannot be typed. The full rule set still runs on submit,
 * because restricting input does not make a number valid.
 */
export default function PhoneScreen() {
  const [raw, setRaw] = useState('');
  const [touched, setTouched] = useState(false);
  const mutating = useFuture(select.mutating);
  const apiError = useFuture(select.error);

  const digits = digitsOnly(raw);
  const check = useMemo(() => validatePhone(digits), [digits]);
  // Errors stay hidden until the user has either finished typing or tried to submit —
  // scolding someone mid-entry for an incomplete number is hostile.
  const showError = touched && !check.valid;

  const submit = useCallback(async () => {
    setTouched(true);
    if (!validatePhone(digits).valid) return;

    const challenge = await actions.requestOtp(digits);
    if (challenge) router.push('/(onboarding)/otp');
  }, [digits]);

  return (
    <Screen scroll>
      {/* Step one is the root of the flow, so BackButton hides itself here unless the
          user actually arrived with history behind them — via "Start over", say. */}
      <ScreenHeader step={0} />

      <Animated.View entering={FadeInDown.duration(340)} style={styles.body}>
        <ThemedText type="display">Your future{'\n'}starts here</ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
          Enter your mobile number to begin. Starts at ₹21/day — no income proof, no
          credit score.
        </ThemedText>

        <TextField
          label="Mobile number"
          prefix="+91"
          value={formatPhone(digits)}
          onChangeText={(text) => setRaw(digitsOnly(text).slice(0, PHONE_LENGTH))}
          // Only a field the user actually typed into can be "wrong". `autoFocus`
          // fires a blur when the screen settles, which would otherwise flash an
          // error on an empty field before they touch anything.
          onBlur={() => {
            if (digits.length > 0) setTouched(true);
          }}
          onSubmitEditing={submit}
          keyboardType="number-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          // A formatted value is longer than the raw digits; the cap that matters is
          // enforced in onChangeText above.
          maxLength={PHONE_LENGTH + 1}
          placeholder="98765 43210"
          autoFocus
          returnKeyType="done"
          error={showError ? check.reason : null}
          hint={`We'll send a ${4}-digit code to verify it's you`}
          containerStyle={styles.field}
        />

        {apiError ? (
          <ErrorState
            inline
            error={apiError}
            onRetry={submit}
            onDismiss={actions.clearError}
          />
        ) : null}
      </Animated.View>

      <Button
        label="Continue"
        onPress={submit}
        loading={mutating}
        disabled={digits.length !== PHONE_LENGTH}
        style={styles.cta}
      />

      <ThemedText type="caption" themeColor="textTertiary" style={styles.legal}>
        By continuing you agree to BlinkMoney&apos;s Terms and Privacy Policy.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { marginBlockStart: Spacing.six },
  subtitle: { marginBlockStart: Spacing.three },
  field: { marginBlockStart: Spacing.five },
  cta: { marginBlockStart: Spacing.four },
  legal: { textAlign: 'center', marginBlock: Spacing.three },
});
