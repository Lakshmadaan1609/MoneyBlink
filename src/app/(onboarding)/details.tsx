import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ErrorState } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import {
  MAX_NAME_LENGTH,
  digitsOnly,
  validateAge,
  validateName,
} from '@/domain/validation';
import type { Gender } from '@/domain/types';
import { actions, select, useFuture } from '@/store/future-store';
import { Spacing } from '@/theme';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

/**
 * Step 3 — name, age and gender.
 *
 * All three answers are cheap to give and they belong together, so they are asked on one
 * screen rather than spread over two. Gender is a sliding switch instead of a pair of
 * character cards: it decides which Future You the user meets in the next screen, and
 * meeting that character is far better as a reveal than as a thumbnail picked off a grid.
 *
 * Age is gated at 18 because that is the real floor for investing.
 */
export default function DetailsScreen() {
  const profile = useFuture(select.profile);
  const mutating = useFuture(select.mutating);
  const apiError = useFuture(select.error);

  // Prefilled when stepping back, so nothing has to be retyped.
  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [touched, setTouched] = useState({ name: false, age: false, gender: false });
  const ageRef = useRef<TextInput>(null);

  const nameCheck = useMemo(() => validateName(name), [name]);
  const ageCheck = useMemo(() => validateAge(age), [age]);
  const ready = nameCheck.valid && ageCheck.valid && gender !== null;

  const submit = useCallback(async () => {
    setTouched({ name: true, age: true, gender: true });
    if (!validateName(name).valid || !validateAge(age).valid || !gender) return;

    const ok = await actions.saveDetails({
      name: name.trim(),
      age: Number(digitsOnly(age)),
      gender,
    });
    if (ok) router.push('/(story)/meeting');
  }, [age, gender, name]);

  return (
    <Screen scroll>
      {/* OTP is consumed on verify, so back from here lands on the number entry — the
          only step worth returning to. */}
      <ScreenHeader step={2} backFallback="/(onboarding)/phone" />

      <Animated.View entering={FadeInDown.duration(340)} style={styles.body}>
        <ThemedText type="display">Tell us{'\n'}about you</ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
          We&apos;ll use this to build your Future You.
        </ThemedText>

        <TextField
          label="What is your name?"
          value={name}
          onChangeText={setName}
          // See phone.tsx: an untouched field is not a wrong field.
          onBlur={() => {
            if (name.length > 0) setTouched((t) => ({ ...t, name: true }));
          }}
          onSubmitEditing={() => ageRef.current?.focus()}
          placeholder="Your full name"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          maxLength={MAX_NAME_LENGTH}
          returnKeyType="next"
          autoFocus
          error={touched.name && !nameCheck.valid ? nameCheck.reason : null}
          containerStyle={styles.field}
        />

        <TextField
          ref={ageRef}
          label="How old are you?"
          value={age}
          // Three digits max: nobody investing is over 100, and it blocks the paste of
          // an entire date of birth.
          onChangeText={(text) => setAge(digitsOnly(text).slice(0, 3))}
          onBlur={() => {
            if (age.length > 0) setTouched((t) => ({ ...t, age: true }));
          }}
          onSubmitEditing={submit}
          placeholder="24"
          keyboardType="number-pad"
          maxLength={3}
          returnKeyType="done"
          error={touched.age && !ageCheck.valid ? ageCheck.reason : null}
          hint="You must be 18 or older to invest"
          containerStyle={styles.field}
        />

        <SegmentedControl
          label="Your gender"
          options={GENDERS}
          value={gender}
          onChange={setGender}
          error={touched.gender && !gender ? 'Pick one to continue' : null}
          hint="This picks the Future You who guides you"
          containerStyle={styles.field}
        />

        {apiError ? (
          <ErrorState inline error={apiError} onDismiss={actions.clearError} />
        ) : null}
      </Animated.View>

      <Button
        label="Meet your Future You"
        onPress={submit}
        loading={mutating}
        disabled={!ready}
        haptic="success"
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { marginBlockStart: Spacing.five },
  subtitle: { marginBlockStart: Spacing.three },
  field: { marginBlockStart: Spacing.four },
  cta: { marginBlock: Spacing.four },
});
