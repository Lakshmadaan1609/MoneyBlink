import * as Haptics from 'expo-haptics';
import { memo, useEffect, type ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ChevronIcon, type IconProps } from '@/components/brand/icons';
import { ThemedText } from '@/components/themed-text';
import type { FeedItem } from '@/domain/feed';
import { Palette, Radius, Spacing, withAlpha } from '@/theme';

type FeedRowProps = {
  item: FeedItem;
  icon: ComponentType<IconProps>;
  /** Category tint from the theme's `Accent` map. */
  color: string;
  expanded: boolean;
  onToggle: () => void;
  onAction: () => void;
};

/**
 * One line of Today's update.
 *
 * A chevron that only navigates makes the feed a menu. Opening in place keeps the
 * context — the number that prompted the question stays on screen beside its answer —
 * and the row still offers the jump for anyone who wants the full surface.
 *
 * The chevron rotates rather than swapping glyphs, so the affordance stays continuous
 * and the row reads as one thing opening rather than two states flickering.
 */
function FeedRowBase({ item, icon: Icon, color, expanded, onToggle, onAction }: FeedRowProps) {
  const open = useSharedValue(0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    open.value = withTiming(expanded ? 1 : 0, { duration: 220 });
  }, [expanded, open]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${open.value * 90}deg` }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.015, { damping: 20, stiffness: 280 }) }],
  }));

  const toggle = () => {
    void Haptics.selectionAsync().catch(() => {});
    onToggle();
  };

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${item.title} ${item.detail}`}
        accessibilityHint="Tap for detail"
        onPressIn={() => {
          pressed.value = 1;
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
        onPress={toggle}
        style={[styles.row, expanded && styles.rowOpen]}>
        <View style={styles.head}>
          <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.14) }]}>
            <Icon size={22} color={color} />
          </View>

          <View style={styles.text}>
            <ThemedText type="bodyBold">{item.title}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {item.detail}
            </ThemedText>
          </View>

          <Animated.View style={chevronStyle}>
            <ChevronIcon size={20} color={Palette.textTertiary} />
          </Animated.View>
        </View>

        {expanded ? (
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(120)}
            style={styles.detail}>
            <ThemedText type="caption" themeColor="textSecondary">
              {item.expanded}
            </ThemedText>

            <Pressable
              accessibilityRole="link"
              accessibilityLabel={item.action}
              onPress={onAction}
              hitSlop={8}
              style={styles.action}>
              <ThemedText type="smallBold" themeColor="brand">
                {item.action}
              </ThemedText>
              <ChevronIcon size={16} color={Palette.brand} />
            </Pressable>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
  },
  rowOpen: { borderColor: withAlpha(Palette.brand, 0.3) },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  badge: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  detail: {
    marginBlockStart: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    gap: Spacing.three,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});

export const FeedRow = memo(FeedRowBase);
