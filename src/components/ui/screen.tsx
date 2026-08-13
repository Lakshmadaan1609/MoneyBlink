import { memo, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Layout, Palette, Spacing } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Wraps content in a ScrollView. Off by default so fixed layouts stay fixed. */
  scroll?: boolean;
  /** Centres content vertically — for hero and empty states. */
  center?: boolean;
  /** Removes horizontal padding when a child needs to bleed to the edges. */
  bleed?: boolean;
  /**
   * Enables pull-to-refresh. Requires `scroll`. The spinner is driven from this
   * component's own state rather than a caller-supplied flag, so a screen cannot leave
   * it spinning forever by forgetting to clear one.
   */
  onRefresh?: () => Promise<unknown>;
  style?: ViewStyle;
  footer?: ReactNode;
};

/**
 * Page shell.
 *
 * Owns safe-area insets and the readable-width cap in one place, so no screen has to
 * remember either. Content is centred and capped at `maxContentWidth` rather than
 * stretched, which is what keeps tablets and large phones from looking broken.
 */
function ScreenBase({ children, scroll, center, bleed, onRefresh, style, footer }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      // `finally`, so a rejected refresh still stops the spinner. A stuck spinner reads
      // as a hung app.
      setRefreshing(false);
    }
  };

  const padding: ViewStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingHorizontal: bleed ? 0 : Layout.screenPadding,
  };

  const inner = <View style={[styles.measure, center && styles.center, style]}>{children}</View>;

  return (
    <View style={styles.root}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, padding, center && styles.center]}
          showsVerticalScrollIndicator={false}
          // Lets a tap dismiss the keyboard without eating the first press on a button.
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void refresh()}
                tintColor={Palette.brand}
                colors={[Palette.brand]}
                progressBackgroundColor={Palette.bgCard}
              />
            ) : undefined
          }>
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding, center && styles.center]}>{inner}</View>
      )}

      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.measure}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.bgPage },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  center: { justifyContent: 'center' },
  measure: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    // Deliberately no `flexGrow`. Inside a ScrollView it would pin this view to the
    // viewport height, so content taller than the screen clips instead of extending
    // the scrollable area — the button below the fold becomes unreachable. Screens
    // that need a pinned CTA use the `footer` slot instead.
  },
  footer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    backgroundColor: Palette.bgPage,
  },
});

export const Screen = memo(ScreenBase);
