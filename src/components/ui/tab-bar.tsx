import type { BottomTabBarProps } from 'expo-router/js-tabs';
import * as Haptics from 'expo-haptics';
import { memo, useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BorrowIcon,
  FutureIcon,
  GiftIcon,
  HomeIcon,
  InvestIcon,
  type IconProps,
} from '@/components/brand/icons';
import { ThemedText } from '@/components/themed-text';
import { Layout, Palette, Radius, Spacing, withAlpha } from '@/theme';

/** Route name → icon. Anything unmapped falls back rather than rendering a blank slot. */
const ICONS: Record<string, ComponentType<IconProps>> = {
  home: HomeIcon,
  invest: InvestIcon,
  borrow: BorrowIcon,
  future: FutureIcon,
  rewards: GiftIcon,
};

/** Gap between the sliding pill and the edges of its quarter of the bar. */
const PILL_INSET = Spacing.two;

/**
 * The app's bottom navigation.
 *
 * Written by hand rather than configured through `tabBarStyle` because the default bar
 * cannot express the brand: the pill slides between tabs on the UI thread, the icons
 * gain weight rather than just colour when active, and the whole bar sits on the page
 * background instead of a lighter chrome layer.
 *
 * The pill is positioned from a measured width divided by the tab count, so it stays
 * aligned on any screen size and after a rotation without hard-coded numbers.
 */
function TabBarBase({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);

  const count = state.routes.length;
  const segment = count > 0 ? width / count : 0;

  const pillStyle = useAnimatedStyle(() => ({
    width: Math.max(0, segment - PILL_INSET * 2),
    transform: [
      {
        translateX: withSpring(state.index * segment + PILL_INSET, {
          damping: 20,
          stiffness: 220,
          mass: 0.6,
        }),
      },
    ],
    // Nothing to place until the bar has been measured; fading in avoids a flash at 0.
    opacity: withTiming(segment > 0 ? 1 : 0, { duration: 140 }),
  }));

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
      <View style={styles.row} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none" />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.title ?? route.name;
          const Icon = ICONS[route.name] ?? HomeIcon;
          const color = focused ? Palette.brand : Palette.textSecondary;

          const onPress = () => {
            // The event is what lets a screen intercept its own tab press — scroll to
            // top, close a sheet — so it is emitted even when nothing listens today.
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (focused || event.defaultPrevented) return;
            void Haptics.selectionAsync().catch(() => {});
            navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={() =>
                navigation.emit({ type: 'tabLongPress', target: route.key })
              }>
              <Icon size={24} color={color} active={focused} />
              <ThemedText
                type="caption"
                themeColor={focused ? 'brand' : 'textSecondary'}
                style={styles.label}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    backgroundColor: Palette.bgPage,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  // Capped and centred to match the content column above it. The bar's background and
  // hairline still span the viewport — it is the chrome of the window — but letting the
  // tabs themselves stretch across a desktop browser turned a 44pt target into a 380pt
  // one and detached the navigation from the column it belongs to.
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
  },
  pill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radius.lg,
    // Tinted rather than solid: a solid brand block would out-shout the screen above it.
    backgroundColor: withAlpha(Palette.brand, 0.12),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
  },
  label: { textAlign: 'center' },
});

export const TabBar = memo(TabBarBase);
