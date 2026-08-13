import { forwardRef, memo, useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Layout, Palette, Radius, Spacing } from '@/theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Shown beneath the field, in red, and turns the border red. */
  error?: string | null;
  /** Static text locked to the left of the input, e.g. a "+91" dial code. */
  prefix?: string;
  /** Muted helper text, replaced by `error` when one is present. */
  hint?: string;
  containerStyle?: ViewStyle;
};

/**
 * Labelled text input.
 *
 * The border colour animates between rest, focus and error on the UI thread. Errors are
 * shown beneath the field rather than in an alert, so the user can read the problem and
 * the offending value at the same time.
 */
const TextFieldBase = forwardRef<TextInput, TextFieldProps>(function TextFieldBase(
  { label, error, prefix, hint, containerStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);
  const invalid = useSharedValue(0);

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (event) => {
      setFocused(true);
      focus.value = withTiming(1, { duration: 160 });
      onFocus?.(event);
    },
    [focus, onFocus],
  );

  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (event) => {
      setFocused(false);
      focus.value = withTiming(0, { duration: 160 });
      onBlur?.(event);
    },
    [focus, onBlur],
  );

  // Must be an effect, not a render-body assignment: writing to a shared value during
  // render mutates state React may discard, and Reanimated warns about exactly this.
  useEffect(() => {
    invalid.value = withTiming(error ? 1 : 0, { duration: 160 });
  }, [error, invalid]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      invalid.value,
      [0, 1],
      [
        interpolateColor(focus.value, [0, 1], [Palette.border, Palette.brand]),
        Palette.error,
      ],
    ),
  }));

  return (
    <View style={containerStyle}>
      <ThemedText type="caption" themeColor={focused ? 'brand' : 'textSecondary'}>
        {label}
      </ThemedText>

      <Animated.View style={[styles.field, borderStyle]}>
        {prefix ? (
          <>
            <ThemedText type="bodyBold" themeColor="textSecondary">
              {prefix}
            </ThemedText>
            <View style={styles.divider} />
          </>
        ) : null}

        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={Palette.textTertiary}
          selectionColor={Palette.brand}
          cursorColor={Palette.brand}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label}
          {...rest}
        />
      </Animated.View>

      {error ? (
        <ThemedText type="caption" themeColor="error" style={styles.helper}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="caption" themeColor="textTertiary" style={styles.helper}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Layout.minTouchTarget + 8,
    marginBlockStart: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    backgroundColor: Palette.bgCard,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Palette.border,
  },
  input: {
    flex: 1,
    color: Palette.textPrimary,
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
    // Android adds its own vertical padding and baseline; both must go or the text
    // sits off-centre against the prefix.
    padding: 0,
    includeFontPadding: false,
  },
  helper: { marginBlockStart: Spacing.one },
});

export const TextField = memo(TextFieldBase);
