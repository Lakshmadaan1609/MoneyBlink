import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { EdgeFade } from '@/components/future-self/edge-fade';
import { FutureAvatar } from '@/components/future-self/future-avatar';
import { ThemedText } from '@/components/themed-text';
import { bindingConstraint, nextStage, stageFor, stageProgress } from '@/domain/evolution';
import { formatINR, pluralDays } from '@/lib/format';
import {
  Palette,
  Radius,
  Spacing,
  avatarBackdrop,
  withAlpha,
  type AvatarGender,
  type AvatarState,
} from '@/theme';

type FutureHeroProps = {
  gender: AvatarGender;
  avatarState: AvatarState;
  /** The user's age today; the card projects it forward. */
  age?: number;
  streakDays: number;
  invested: number;
  /** Lines the character can say, in priority order. Tapping cycles them. */
  lines: string[];
};

/** Everything in the app is quoted at ten years, so the projected age matches. */
const YEARS_AHEAD = 10;

/**
 * Your future self.
 *
 * The one card in the product where the character is the subject rather than a reaction.
 * It reports a *standing* — a stage earned by clearing both a consistency and a capital
 * bar — because "you have ₹4,000" says nothing while "Compounding, 6 days from
 * Financially Free" says exactly what to do next.
 *
 * Tapping cycles what they say. There is always more than one true thing to tell you,
 * and a card you can poke is one you come back to.
 */
function FutureHeroBase({
  gender,
  avatarState,
  age,
  streakDays,
  invested,
  lines,
}: FutureHeroProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const pressed = useSharedValue(0);

  const stage = stageFor(streakDays, invested);
  const next = nextStage(stage);
  const progress = stageProgress(streakDays, invested);
  const blocker = bindingConstraint(streakDays, invested);

  const line = lines[lineIndex % Math.max(1, lines.length)] ?? '';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.015, { damping: 20, stiffness: 280 }) }],
  }));

  const cycle = () => {
    if (lines.length < 2) return;
    void Haptics.selectionAsync().catch(() => {});
    setLineIndex((i) => i + 1);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Your future self. ${stage.title}. ${line}`}
      accessibilityHint={lines.length > 1 ? 'Tap to hear something else' : undefined}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      onPress={cycle}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* Greenest at the top-left, behind the words, resolving to card colour at the
            bottom-right where the artwork sits — the art has no alpha channel, so it
            needs a flat field to land on rather than a gradient to fight. */}
        <LinearGradient
          colors={[
            withAlpha(Palette.brandSecondary, 0.55),
            withAlpha(Palette.brandDecorative, 0.16),
            Palette.bgCard,
          ]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />

        <View style={styles.body}>
          <View style={styles.text}>
            <ThemedText type="subtitle" themeColor="brand">
              Your future self
            </ThemedText>
            <ThemedText type="smallBold" style={styles.standing}>
              {age ? `${age + YEARS_AHEAD} yrs old · ` : ''}
              {stage.title}
            </ThemedText>

            <Animated.View
              key={line}
              entering={FadeIn.duration(260)}
              exiting={FadeOut.duration(120)}
              style={styles.bubble}>
              <ThemedText type="caption">{line}</ThemedText>
            </Animated.View>
          </View>

          <View style={[styles.art, { backgroundColor: avatarBackdrop(gender) }]}>
            <FutureAvatar gender={gender} state={avatarState} size={132} framed={false} />
            {/* Dissolves the art's opaque rectangle into the card's own colour. */}
            <EdgeFade color={Palette.bgCard} size={26} edges={['top', 'left']} />
          </View>
        </View>

        {next ? (
          <View style={styles.progressBlock}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {blocker === 'streak'
                ? `${pluralDays(Math.max(0, next.minStreak - streakDays))} of consistency to ${next.title}`
                : blocker === 'invested'
                  ? `${formatINR(Math.max(0, next.minInvested - invested))} more to ${next.title}`
                  : `Ready for ${next.title}`}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.progressBlock}>
            <ThemedText type="caption" themeColor="gold">
              {stage.tagline}
            </ThemedText>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: withAlpha(Palette.brand, 0.22),
    backgroundColor: Palette.bgCard,
    overflow: 'hidden',
    padding: Spacing.four,
  },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  body: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  text: { flex: 1, gap: Spacing.one },
  standing: { marginBlockEnd: Spacing.two },
  bubble: {
    alignSelf: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(Palette.white, 0.1),
    backgroundColor: withAlpha(Palette.black, 0.42),
  },
  art: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    // Pulled into the padding so the character reaches the card's own edge rather than
    // floating in a box inside it.
    marginBlockEnd: -Spacing.four,
    marginInlineEnd: -Spacing.four,
  },
  progressBlock: { marginBlockStart: Spacing.four, gap: Spacing.two },
  track: {
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: withAlpha(Palette.black, 0.5),
    overflow: 'hidden',
  },
  fill: { height: 5, borderRadius: Radius.pill, backgroundColor: Palette.brand },
});

export const FutureHero = memo(FutureHeroBase);
