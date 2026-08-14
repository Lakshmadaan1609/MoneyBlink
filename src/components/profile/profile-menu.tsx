import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { memo, useEffect, useState, type ComponentType } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ChevronIcon,
  FutureIcon,
  GiftIcon,
  HelpIcon,
  LogoutIcon,
  type IconProps,
} from '@/components/brand/icons';
import { FutureAvatar } from '@/components/future-self/future-avatar';
import { useAvatarState } from '@/components/future-self/use-avatar-state';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { stageFor } from '@/domain/evolution';
import { firstName } from '@/domain/validation';
import { pluralDays } from '@/lib/format';
import { actions, select, useFuture } from '@/store/future-store';
import { Layout, Palette, Radius, Spacing, withAlpha } from '@/theme';

/** Sits just under the header row the trigger lives in. */
const HEADER_OFFSET = 52;
const PANEL_WIDTH = 288;
const AVATAR = 38;

type MenuItem = {
  key: string;
  icon: ComponentType<IconProps>;
  title: string;
  href?: Href;
  danger?: boolean;
};

const ITEMS: MenuItem[] = [
  { key: 'profile', icon: FutureIcon, title: 'My Profile', href: '/profile' },
  { key: 'refer', icon: GiftIcon, title: 'Refer a Friend', href: '/(app)/rewards' },
  { key: 'faq', icon: HelpIcon, title: 'FAQ', href: '/faq' },
  { key: 'logout', icon: LogoutIcon, title: 'Logout', danger: true },
];

/**
 * The account menu.
 *
 * Self-contained: it renders its own trigger and owns its open state, so dropping it into
 * any header is one line. Presented through a `Modal` rather than an absolute overlay so
 * the Android back button dismisses it and the screen behind is genuinely inert — a menu
 * you can scroll the page underneath is a menu that feels pasted on.
 *
 * The panel is anchored to the top-right and scales from that corner, so it reads as
 * growing out of the button that opened it rather than appearing in the middle of nowhere.
 */
function ProfileMenuBase() {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const profile = useFuture(select.profile);
  const streak = useFuture(select.streak);
  const portfolio = useFuture(select.portfolio);
  const avatarState = useAvatarState();

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();

  const gender = profile?.gender ?? 'male';
  const name = profile?.name ? firstName(profile.name) : 'friend';
  const stage = stageFor(streak.current, portfolio.invested);

  const pressed = useSharedValue(0);
  const triggerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.06, { damping: 18, stiffness: 300 }) }],
  }));

  // Scale is driven by hand rather than through `withInitialValues`, which only accepts
  // opacity. The spring is what makes the panel feel like it is being pulled out of the
  // button instead of cross-fading into place.
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = open
      ? withSpring(1, { damping: 18, stiffness: 240, mass: 0.7 })
      : withTiming(0, { duration: 120 });
  }, [open, reveal]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduced ? 1 : 0.9 + reveal.value * 0.1 }],
  }));

  const go = (href: Href) => {
    setOpen(false);
    // Let the dismiss animation start before the push, so the two do not fight over the
    // same frame and produce a visible stutter.
    setTimeout(() => router.push(href), reduced ? 0 : 120);
  };

  const logout = async () => {
    setConfirming(false);
    setOpen(false);
    await actions.reset();
    router.replace('/(onboarding)/phone');
  };

  // Never wider than the screen allows, so a small device does not get a panel hanging
  // off the edge.
  const panelWidth = Math.min(PANEL_WIDTH, width - Layout.screenPadding * 2);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Account menu for ${name}`}
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        onPressIn={() => {
          pressed.value = 1;
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
        onPress={() => {
          void Haptics.selectionAsync().catch(() => {});
          setOpen(true);
        }}>
        <Animated.View style={[styles.trigger, triggerStyle]}>
          <FutureAvatar gender={gender} state={avatarState} size={AVATAR} framed={false} breathing={false} />
        </Animated.View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}>
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(160)}
          exiting={reduced ? undefined : FadeOut.duration(140)}
          style={styles.scrim}>
          <Pressable
            style={styles.fill}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={() => setOpen(false)}
          />
        </Animated.View>

        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(180)}
          exiting={reduced ? undefined : FadeOut.duration(120)}
          style={[
            styles.panelWrap,
            panelStyle,
            {
              top: insets.top + HEADER_OFFSET,
              right: Layout.screenPadding,
              width: panelWidth,
            },
          ]}
          accessibilityViewIsModal>
          {/* Glass, not a flat sheet: the page's own colour bleeding through is what
              makes the panel read as floating above it rather than replacing it. */}
          <BlurView intensity={38} tint="dark" style={styles.panel}>
            <View style={styles.header}>
              <FutureAvatar gender={gender} state={avatarState} size={46} framed={false} breathing={false} />

              <View style={styles.headerText}>
                <ThemedText type="bodyBold" numberOfLines={1}>
                  {name}
                </ThemedText>
                <View style={styles.badges}>
                  <View style={styles.dna}>
                    <ThemedText type="caption" themeColor="brand">
                      {stage.dna}
                    </ThemedText>
                  </View>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {pluralDays(streak.current)}
                    {streak.current > 0 ? ' 🔥' : ''}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.items}>
              {ITEMS.map((item) => (
                <MenuRow
                  key={item.key}
                  item={item}
                  onPress={() => (item.href ? go(item.href) : setConfirming(true))}
                />
              ))}
            </View>
          </BlurView>
        </Animated.View>
      </Modal>

      <Modal
        visible={confirming}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setConfirming(false)}>
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(160)}
          exiting={reduced ? undefined : FadeOut.duration(140)}
          style={[styles.scrim, styles.centred]}>
          <Pressable
            style={styles.fill}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={() => setConfirming(false)}
          />

          <Animated.View
            entering={reduced ? undefined : ZoomIn.springify().damping(18).stiffness(240)}
            style={styles.confirm}
            accessibilityViewIsModal>
            <ThemedText type="subtitle">Log out?</ThemedText>
            {/* Named plainly. This build has no server-side account, so signing out is
                a wipe — saying "you can sign back in" would be a lie. */}
            <ThemedText type="body" themeColor="textSecondary" style={styles.confirmCopy}>
              Your streak, contributions and Future You live on this device. Logging out
              clears them and starts you at sign-up again.
            </ThemedText>

            <Button
              label="Log out and clear"
              variant="danger"
              onPress={() => void logout()}
              haptic="medium"
              style={styles.confirmCta}
            />
            <Button
              label="Stay signed in"
              variant="secondary"
              onPress={() => setConfirming(false)}
              haptic="none"
            />
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

function MenuRow({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  const pressed = useSharedValue(0);
  const Icon = item.icon;
  const tint = item.danger ? Palette.error : Palette.brand;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1 - pressed.value * 0.35, { duration: 90 }),
    transform: [{ scale: withSpring(1 - pressed.value * 0.02, { damping: 20, stiffness: 320 }) }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        onPressIn={() => {
          pressed.value = 1;
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
        onPress={() => {
          void Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        // A hairline above the destructive item, so it is never the row a thumb lands on
        // by momentum after the one above it.
        style={[styles.row, item.danger && styles.rowDanger]}>
        <View style={[styles.rowIcon, { backgroundColor: withAlpha(tint, 0.12) }]}>
          <Icon size={19} color={tint} />
        </View>

        <ThemedText type="body" themeColor={item.danger ? 'error' : 'text'} style={styles.rowTitle}>
          {item.title}
        </ThemedText>

        <ChevronIcon size={16} color={item.danger ? Palette.error : Palette.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: withAlpha(Palette.brand, 0.35),
    alignItems: 'center',
    justifyContent: 'center',
  },

  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: withAlpha(Palette.black, 0.55),
  },
  centred: { alignItems: 'center', justifyContent: 'center', padding: Layout.screenPadding },

  panelWrap: {
    position: 'absolute',
    // Scales out of the corner it is anchored to, rather than swelling from its middle.
    transformOrigin: 'top right',
    borderRadius: 24,
    // Soft and wide: a tight shadow reads as a border, which the panel already has.
    shadowColor: Palette.black,
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  panel: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: withAlpha(Palette.white, 0.09),
    // Tint under the blur. Android's blur is weaker, so this is what carries the panel
    // there rather than an optional flourish.
    backgroundColor: withAlpha(Palette.bgCard, 0.72),
    padding: Spacing.two,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
  },
  headerText: { flex: 1, gap: Spacing.one },
  badges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  dna: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: withAlpha(Palette.brand, 0.14),
    borderWidth: 1,
    borderColor: withAlpha(Palette.brand, 0.28),
  },

  items: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Layout.minTouchTarget,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
  },
  rowDanger: {
    marginBlockStart: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: withAlpha(Palette.white, 0.08),
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { flex: 1 },

  confirm: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  confirmCopy: { marginBlockEnd: Spacing.two },
  confirmCta: { marginBlockStart: Spacing.two },
});

export const ProfileMenu = memo(ProfileMenuBase);
