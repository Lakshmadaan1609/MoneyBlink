import * as Haptics from 'expo-haptics';
import { memo, useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Layout, Palette, Radius, Spacing } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  /** Fills the available width. On by default — most buttons here are full-bleed CTAs. */
  block?: boolean;
  style?: ViewStyle;
  /** Physical feedback strength. `none` for low-stakes, repeated taps. */
  haptic?: 'light' | 'medium' | 'success' | 'none';
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Primary action.
 *
 * The press scale runs entirely on the UI thread via Reanimated, so it stays smooth
 * even while the JS thread is busy handling the request the press just fired.
 */
function ButtonBase({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  block = true,
  style,
  haptic = 'light',
}: ButtonProps) {
  const pressed = useSharedValue(0);
  const inert = disabled || loading;

  // Scale only. Opacity is left to the static `inert` style — animating it here would
  // sit later in the style array and silently override the disabled dimming.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.04, { damping: 18, stiffness: 260 }) }],
  }));

  const handlePress = useCallback(() => {
    if (inert) return;
    if (haptic !== 'none') {
      const style_ =
        haptic === 'success'
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Haptics.impactAsync(
              haptic === 'medium'
                ? Haptics.ImpactFeedbackStyle.Medium
                : Haptics.ImpactFeedbackStyle.Light,
            );
      // Haptics are a nicety — a device without a taptic engine must not break the tap.
      void style_.catch(() => {});
    }
    onPress();
  }, [haptic, inert, onPress]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inert), busy: Boolean(loading) }}
      accessibilityLabel={label}
      disabled={inert}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      onPress={handlePress}
      style={[
        styles.base,
        styles[variant],
        block && styles.block,
        inert && styles.inert,
        animatedStyle,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Palette.brandDeep : Palette.brand}
        />
      ) : (
        <View style={styles.content}>
          <ThemedText type="bodyBold" themeColor={labelColor(variant)}>
            {label}
          </ThemedText>
        </View>
      )}
    </AnimatedPressable>
  );
}

function labelColor(variant: NonNullable<ButtonProps['variant']>) {
  if (variant === 'primary') return 'textOnAccent' as const;
  if (variant === 'danger') return 'error' as const;
  return 'text' as const;
}

const styles = StyleSheet.create({
  base: {
    minHeight: Layout.minTouchTarget + 8,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    borderWidth: 1,
  },
  block: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  primary: { backgroundColor: Palette.brand, borderColor: Palette.brand },
  secondary: { backgroundColor: Palette.bgChip, borderColor: Palette.border },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: 'transparent', borderColor: Palette.error },
  // 0.45 keeps a disabled label above the contrast floor; lower reads as invisible.
  inert: { opacity: 0.45 },
});

export const Button = memo(ButtonBase);
