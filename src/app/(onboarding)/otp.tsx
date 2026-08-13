import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ErrorState } from '@/components/ui/states';
import { MOCK_OTP, OTP_LENGTH, formatPhone } from '@/domain/validation';
import { actions, select, useFuture } from '@/store/future-store';
import { Palette, Radius, Spacing } from '@/theme';

const RESEND_SECONDS = 30;

/**
 * Step 2 — verify the code.
 *
 * Submits automatically once the final digit lands, because asking someone to type four
 * digits and then reach for a button is pure friction. The button remains for anyone
 * who edits a digit afterwards.
 */
export default function OtpScreen() {
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const auth = useFuture(select.auth);
  const mutating = useFuture(select.mutating);
  const apiError = useFuture(select.error);
  // Guards against auto-submit firing twice if the user edits and re-completes quickly.
  const submitting = useRef(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const submit = useCallback(
    async (value: string) => {
      if (submitting.current || value.length !== OTP_LENGTH) return;
      submitting.current = true;
      const ok = await actions.verifyOtp(value);
      submitting.current = false;
      if (ok) router.replace('/(onboarding)/details');
    },
    [],
  );

  const resend = useCallback(() => {
    if (!auth.phone) return;
    setSeconds(RESEND_SECONDS);
    setCode('');
    actions.clearError();
    void actions.requestOtp(auth.phone);
  }, [auth.phone]);

  // Reached without a number — deep link, or storage cleared mid-flow.
  if (!auth.phone) return <Redirected />;

  return (
    <Screen scroll>
      <ScreenHeader step={1} backFallback="/(onboarding)/phone" />

      <Animated.View entering={FadeInDown.duration(340)} style={styles.body}>
        <ThemedText type="display">Verify your{'\n'}number</ThemedText>

        <View style={styles.sentTo}>
          <ThemedText type="body" themeColor="textSecondary">
            Code sent to +91 {formatPhone(auth.phone)}
          </ThemedText>
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/(onboarding)/phone')
            }
            hitSlop={8}>
            <ThemedText type="smallBold" themeColor="brand">
              Change
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.otp}>
          <OtpInput
            value={code}
            onChange={(next) => {
              setCode(next);
              if (apiError) actions.clearError();
            }}
            onComplete={submit}
            error={Boolean(apiError)}
            length={OTP_LENGTH}
            autoFocus
          />
        </View>

        {/* No SMS channel exists behind the mock, so the code is shown rather than
            left undiscoverable. A real build would delete this block outright. */}
        <View style={styles.demoHint}>
          <ThemedText type="caption" themeColor="textSecondary">
            Demo build — use code{' '}
            <ThemedText type="caption" themeColor="brand">
              {MOCK_OTP}
            </ThemedText>
          </ThemedText>
        </View>

        {apiError ? (
          <ErrorState inline error={apiError} onDismiss={actions.clearError} />
        ) : null}

        <View style={styles.resend}>
          {seconds > 0 ? (
            <ThemedText type="small" themeColor="textTertiary">
              Resend code in {seconds}s
            </ThemedText>
          ) : (
            <Pressable onPress={resend} hitSlop={8}>
              <ThemedText type="smallBold" themeColor="brand">
                Resend code
              </ThemedText>
            </Pressable>
          )}
        </View>
      </Animated.View>

      <Button
        label="Verify"
        onPress={() => submit(code)}
        loading={mutating}
        disabled={code.length !== OTP_LENGTH}
        haptic="success"
        style={styles.cta}
      />
    </Screen>
  );
}

/** Sends the user back to step one when they arrive here without a phone number. */
function Redirected() {
  useEffect(() => {
    router.replace('/(onboarding)/phone');
  }, []);
  return <View />;
}

const styles = StyleSheet.create({
  body: { marginBlockStart: Spacing.six },
  sentTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBlockStart: Spacing.three,
    flexWrap: 'wrap',
  },
  otp: { marginBlockStart: Spacing.five },
  demoHint: {
    alignSelf: 'center',
    marginBlockStart: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Palette.bgChip,
  },
  resend: { alignItems: 'center', marginBlockStart: Spacing.four },
  cta: { marginBlock: Spacing.four },
});
