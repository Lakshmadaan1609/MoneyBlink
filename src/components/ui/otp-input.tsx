import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { digitsOnly } from '@/domain/validation';
import { Palette, Radius, Spacing } from '@/theme';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  /** Fired once the final digit lands, so the user need not press a button. */
  onComplete?: (value: string) => void;
  error?: boolean;
  autoFocus?: boolean;
};

/**
 * Segmented code entry.
 *
 * A single hidden `TextInput` drives all the boxes rather than one input per digit.
 * Per-box inputs look simpler but break in exactly the ways that matter: pasting a code
 * fills only the first box, backspace at a boundary loses focus, and SMS autofill
 * delivers the whole string to one field. One input handles all three for free.
 */
function OtpInputBase({
  value,
  onChange,
  length = 4,
  onComplete,
  error,
  autoFocus,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const shake = useSharedValue(0);

  // Shake on rejection — faster to understand than reading an error message.
  useEffect(() => {
    if (error) {
      shake.value = withSequence(
        withTiming(-8, { duration: 45 }),
        withTiming(8, { duration: 45 }),
        withTiming(-5, { duration: 45 }),
        withTiming(0, { duration: 45 }),
      );
    }
  }, [error, shake]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const handleChange = useCallback(
    (raw: string) => {
      const next = digitsOnly(raw).slice(0, length);
      onChange(next);
      if (next.length === length) onComplete?.(next);
    },
    [length, onChange, onComplete],
  );

  const focus = useCallback(() => inputRef.current?.focus(), []);

  return (
    <Pressable onPress={focus} accessibilityRole="none">
      <Animated.View style={[styles.row, shakeStyle]}>
        {Array.from({ length }, (_, i) => {
          const char = value[i] ?? '';
          const isCursor = focused && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={[
                styles.box,
                Boolean(char) && styles.boxFilled,
                isCursor && styles.boxActive,
                error && styles.boxError,
              ]}>
              <ThemedText type="display" themeColor={error ? 'error' : 'text'}>
                {char}
              </ThemedText>
            </View>
          );
        })}
      </Animated.View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        // Lets Android and iOS drop an SMS code straight in.
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        style={styles.hidden}
        accessibilityLabel={`${length} digit verification code`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three, justifyContent: 'center' },
  box: {
    width: 58,
    height: 68,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: Palette.bgElevated },
  boxActive: { borderColor: Palette.brand },
  boxError: { borderColor: Palette.error },
  // Kept on-screen but invisible: `display:none` would stop it receiving focus and
  // the keyboard would never open.
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export const OtpInput = memo(OtpInputBase);
