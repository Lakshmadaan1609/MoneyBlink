import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import {
  DownloadIcon,
  InstagramIcon,
  MoreIcon,
  WhatsAppIcon,
  type IconProps,
} from '@/components/brand/icons';
import { MilestoneCard } from '@/components/share/milestone-card';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { milestoneCaption } from '@/domain/share';
import { firstName } from '@/domain/validation';
import { select, useFuture } from '@/store/future-store';
import { Layout, Palette, Radius, Spacing } from '@/theme';
import type { ComponentType } from 'react';

type Target = 'download' | 'instagram' | 'whatsapp' | 'more';

/** What each target reports back, so one status line can speak for all of them. */
type Outcome = { text: string; tone: 'brand' | 'error' } | null;

/**
 * Share Milestone.
 *
 * The referral loop's payload. A code is something you have to persuade someone to type;
 * a picture of a 47-day streak persuades on its own, and the code rides along in the
 * caption underneath.
 *
 * The card is captured from live views rather than assembled as a bitmap, so it exports
 * at the device's own pixel density. Everything degrades: if capture is unavailable the
 * screen still shares the caption as text rather than failing outright, because a
 * referral that goes out as plain words beats one that does not go out.
 */
export default function ShareMilestoneScreen() {
  const profile = useFuture(select.profile);
  const auth = useFuture(select.auth);
  const streak = useFuture(select.streak);
  const { width } = useWindowDimensions();

  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState<Target | 'share' | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const available = Math.min(width, Layout.maxContentWidth) - Layout.screenPadding * 2;
  const cardWidth = Math.min(available, 340);

  const caption = milestoneCaption({
    streakDays: streak.current,
    phone: auth.phone,
    name: profile?.name ? firstName(profile.name) : undefined,
  });

  /**
   * Renders the card to a PNG.
   *
   * Imported dynamically, not at module scope. `react-native-view-shot` is a native
   * module, and a client that does not carry it throws on *import* — which expo-router
   * surfaces as "Cannot read property 'ErrorBoundary' of undefined", taking the whole
   * navigator down rather than just this button. Loading it inside the handler keeps the
   * failure local and recoverable.
   */
  async function capture(): Promise<string | null> {
    try {
      const { captureRef } = await import('react-native-view-shot');
      return await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
    } catch {
      return null;
    }
  }

  /** Opens the OS share sheet with the image, or reports that it could not. */
  async function shareImage(uri: string, dialogTitle: string): Promise<boolean> {
    try {
      const Sharing = await import('expo-sharing');
      if (!(await Sharing.isAvailableAsync())) return false;
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle });
      return true;
    } catch {
      return false;
    }
  }

  /** Text-only fallback, used whenever there is no image to attach. */
  async function shareText() {
    await Share.share({ message: caption });
  }

  async function run(target: Target | 'share') {
    if (busy) return;
    setBusy(target);
    setOutcome(null);
    void Haptics.selectionAsync().catch(() => {});

    try {
      if (target === 'download') {
        const uri = await capture();
        if (!uri) {
          setOutcome({ text: 'Couldn’t render the card on this device.', tone: 'error' });
          return;
        }
        try {
          const MediaLibrary = await import('expo-media-library');
          // Asked for at the moment it is needed, with a reason already on screen,
          // rather than at launch where it reads as a demand.
          const permission = await MediaLibrary.requestPermissionsAsync();
          if (!permission.granted) {
            setOutcome({
              text: 'Photos access is off, so there’s nowhere to save it.',
              tone: 'error',
            });
            return;
          }
          await MediaLibrary.saveToLibraryAsync(uri);
          setOutcome({ text: 'Saved to your photos.', tone: 'brand' });
        } catch {
          // No media library in this client. The sheet can still hand the image to
          // whatever the user picks, including their own gallery.
          const shared = await shareImage(uri, 'Save your streak');
          if (!shared) await shareText();
        }
        return;
      }

      if (target === 'whatsapp') {
        // WhatsApp takes text through a deep link but not an image, so the caption goes
        // direct and the picture goes via the sheet — stated plainly rather than
        // silently dropping one of the two.
        const url = `whatsapp://send?text=${encodeURIComponent(caption)}`;
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
          return;
        }
        setOutcome({ text: 'WhatsApp isn’t installed — opening your share sheet.', tone: 'brand' });
      }

      if (target === 'instagram') {
        const uri = await capture();
        // Instagram accepts an image through the system sheet; the story-composer intent
        // needs a native config this build does not have.
        if (uri && (await shareImage(uri, 'Share to Instagram'))) return;
      }

      const uri = await capture();
      if (uri && (await shareImage(uri, 'Share your streak'))) return;
      await shareText();
    } catch {
      // A dismissed share sheet lands here too, which is not a failure worth a red line.
      setOutcome(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ animation: 'slide_from_bottom' }} />

      <View style={styles.nav}>
        <BackButton fallback="/(app)/rewards" />
        <ThemedText type="title">Share Milestone</ThemedText>
        <View style={styles.navSpacer} />
      </View>

      <Animated.View entering={FadeIn.duration(360)} style={styles.preview}>
        <MilestoneCard
          ref={cardRef}
          gender={profile?.gender ?? 'male'}
          streakDays={streak.current}
          width={cardWidth}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.targets}>
        <TargetButton
          icon={DownloadIcon}
          label="Download"
          busy={busy === 'download'}
          onPress={() => void run('download')}
        />
        <TargetButton
          icon={InstagramIcon}
          label="Instagram"
          busy={busy === 'instagram'}
          onPress={() => void run('instagram')}
        />
        <TargetButton
          icon={WhatsAppIcon}
          label="WhatsApp"
          busy={busy === 'whatsapp'}
          onPress={() => void run('whatsapp')}
        />
        <TargetButton
          icon={MoreIcon}
          label="More"
          busy={busy === 'more'}
          onPress={() => void run('more')}
        />
      </Animated.View>

      {outcome ? (
        <Animated.View entering={FadeIn.duration(220)}>
          <ThemedText
            type="caption"
            themeColor={outcome.tone}
            style={styles.outcome}
            accessibilityLiveRegion="polite">
            {outcome.text}
          </ThemedText>
        </Animated.View>
      ) : null}

      <View style={styles.cta}>
        <Button
          label="Share Now"
          onPress={() => void run('share')}
          loading={busy === 'share'}
          haptic="medium"
        />
        <ThemedText type="caption" themeColor="textTertiary" style={styles.ctaNote}>
          Your invite code travels with the picture.
        </ThemedText>
      </View>
    </Screen>
  );
}

function TargetButton({
  icon: Icon,
  label,
  onPress,
  busy,
}: {
  icon: ComponentType<IconProps>;
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: Boolean(busy) }}
      disabled={busy}
      onPress={onPress}
      style={styles.target}>
      <View style={[styles.targetIcon, busy && styles.targetBusy]}>
        <Icon size={22} color={Palette.textPrimary} />
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBlockStart: Spacing.four,
  },
  // Balances the back button so the title sits optically centred.
  navSpacer: { width: Layout.minTouchTarget },
  preview: { alignItems: 'center', marginBlockStart: Spacing.five },
  targets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBlockStart: Spacing.six,
  },
  target: { flex: 1, alignItems: 'center', gap: Spacing.two },
  targetIcon: {
    width: '100%',
    minHeight: 62,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetBusy: { opacity: 0.45 },
  outcome: { textAlign: 'center', marginBlockStart: Spacing.four },
  cta: { marginBlock: Spacing.six, gap: Spacing.three },
  ctaNote: { textAlign: 'center' },
});
