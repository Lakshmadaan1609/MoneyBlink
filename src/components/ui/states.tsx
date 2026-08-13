import { memo, useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { API_ERROR_COPY, type ApiError } from '@/services/api/types';
import { Palette, Radius, Spacing } from '@/theme';

/* ------------------------------------------------------------------ *
 * Skeleton
 * ------------------------------------------------------------------ */

type SkeletonProps = { width?: number | `${number}%`; height?: number; radius?: number; style?: ViewStyle };

/**
 * Loading placeholder.
 *
 * Pulses on the UI thread so the shimmer keeps moving even while the JS thread is
 * blocked doing the very work being waited on — the moment a frozen shimmer would
 * otherwise give the game away.
 */
function SkeletonBase({ width = '100%', height = 16, radius = Radius.sm, style }: SkeletonProps) {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[
        { width, height, borderRadius: radius, backgroundColor: Palette.bgElevated },
        animatedStyle,
        style,
      ]}
    />
  );
}

export const Skeleton = memo(SkeletonBase);

/* ------------------------------------------------------------------ *
 * Empty
 * ------------------------------------------------------------------ */

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
};

function EmptyStateBase({ title, message, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <View style={styles.centered}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <ThemedText type="subtitle" style={styles.centerText}>
        {title}
      </ThemedText>
      <ThemedText type="body" themeColor="textSecondary" style={styles.centerText}>
        {message}
      </ThemedText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} block={false} style={styles.action} />
      ) : null}
    </View>
  );
}

export const EmptyState = memo(EmptyStateBase);

/* ------------------------------------------------------------------ *
 * Error
 * ------------------------------------------------------------------ */

type ErrorStateProps = {
  error: ApiError;
  onRetry?: () => void;
  onDismiss?: () => void;
  /** Compact inline treatment for errors that sit inside a screen, not instead of it. */
  inline?: boolean;
};

/**
 * Failure surface.
 *
 * Copy comes from the error taxonomy, and retry is only offered when the error is
 * actually retryable — a validation failure or a breached borrowing limit will never
 * succeed on a second identical attempt, so offering "Try again" would be a lie.
 */
function ErrorStateBase({ error, onRetry, onDismiss, inline }: ErrorStateProps) {
  const copy = API_ERROR_COPY[error.code];

  if (inline) {
    return (
      <Card variant="danger" style={styles.inline}>
        <ThemedText type="smallBold" themeColor="error">
          {copy.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {error.message || copy.message}
        </ThemedText>
        {error.retryable && onRetry ? (
          <Button label="Try again" variant="secondary" onPress={onRetry} style={styles.inlineAction} />
        ) : null}
      </Card>
    );
  }

  return (
    <View style={styles.centered}>
      <View style={styles.errorBadge} />
      <ThemedText type="subtitle" style={styles.centerText}>
        {copy.title}
      </ThemedText>
      <ThemedText type="body" themeColor="textSecondary" style={styles.centerText}>
        {error.message || copy.message}
      </ThemedText>
      <View style={styles.actions}>
        {error.retryable && onRetry ? <Button label="Try again" onPress={onRetry} /> : null}
        {onDismiss ? <Button label="Go back" variant="ghost" onPress={onDismiss} /> : null}
      </View>
    </View>
  );
}

export const ErrorState = memo(ErrorStateBase);

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  centerText: { textAlign: 'center' },
  icon: { marginBottom: Spacing.two },
  action: { marginTop: Spacing.three },
  actions: { alignSelf: 'stretch', gap: Spacing.two, marginTop: Spacing.four },
  inline: { gap: Spacing.one },
  inlineAction: { marginTop: Spacing.three },
  errorBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Palette.error,
    marginBottom: Spacing.two,
  },
});
