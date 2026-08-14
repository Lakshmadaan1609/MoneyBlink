import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { AvatarMask, MASK_BOTTOM_RIGHT } from '@/components/future-self/avatar-mask';
import { ThemedText } from '@/components/themed-text';
import { milestoneCard } from '@/domain/share';
import {
  FontFamily,
  Palette,
  Radius,
  Spacing,
  avatarAspect,
  getAvatar,
  withAlpha,
  type AvatarGender,
} from '@/theme';

/** Portrait, so it lands correctly in a story and a chat preview alike. */
const ASPECT = 4 / 5;

type MilestoneCardProps = {
  gender: AvatarGender;
  streakDays: number;
  /** Rendered width. Height follows the 4:5 frame. */
  width: number;
};

/**
 * The shareable card.
 *
 * Carries the whole message in text — a screenshot forwarded into a group chat arrives
 * with its caption stripped, so the claim, the product name and the mechanism all have
 * to survive on the image alone.
 *
 * Built as real views rather than a canvas so it captures at whatever pixel density the
 * device has, and fixed at 4:5 because that is the one ratio that survives both an
 * Instagram story crop and a WhatsApp thumbnail without losing the sentence.
 *
 * `forwardRef` is the whole point of the component: the screen captures this node.
 */
export const MilestoneCard = forwardRef<View, MilestoneCardProps>(function MilestoneCard(
  { gender, streakDays, width },
  ref,
) {
  const card = milestoneCard(streakDays);
  const height = width / ASPECT;

  // Everything scales off the frame, not the screen, so the capture reads identically on
  // a small phone and a tablet.
  const headline = Math.round(width * 0.094);
  const artWidth = Math.round(width * 0.4);
  const artHeight = Math.round(artWidth / avatarAspect(gender));

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.card, { width, height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${card.lead} ${card.value} ${card.trail} ${card.body}`}>
      <LinearGradient
        colors={[
          withAlpha(Palette.brandSecondary, 0.34),
          withAlpha(Palette.brandDecorative, 0.07),
          'rgba(0,0,0,0)',
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 1, y: 1 }}
        end={{ x: 0.05, y: 0 }}
        style={styles.wash}
      />

      <Confetti width={width} height={height} />

      <FadedAvatar gender={gender} width={artWidth} height={artHeight} />

      <View style={[styles.content, { padding: Math.round(width * 0.075) }]}>
        <ThemedText type="title" themeColor="brand" style={styles.wordmark}>
          blinkmoney
        </ThemedText>

        <View style={styles.middle}>
          <ThemedText
            style={[styles.headline, { fontSize: headline, lineHeight: headline * 1.32 }]}>
            {card.lead}{' '}
            <ThemedText
              themeColor="brand"
              style={[styles.headline, { fontSize: headline, lineHeight: headline * 1.32 }]}>
              {card.value}
            </ThemedText>{' '}
            {card.trail}
          </ThemedText>

          <View style={styles.rule} />

          {/* Held clear of the artwork, which occupies the lower-right of the frame. */}
          <ThemedText type="caption" themeColor="textSecondary" style={styles.body}>
            {card.body}
          </ThemedText>
        </View>

        <ThemedText type="smallBold" themeColor="brand">
          {card.hashtag}
        </ThemedText>
      </View>
    </View>
  );
});

/**
 * The character, with its rectangle removed.
 *
 * The supplied art ships without an alpha channel, so every avatar sits on an opaque
 * block — on a card with a gradient behind it that reads as a passport photo pasted on.
 * A radial mask fixes it properly: the image's own alpha is replaced by the gradient's,
 * so the figure stays solid at the centre and genuinely disappears at the edges rather
 * than being blended toward a colour that only matches in one spot.
 *
 * The mask is deliberately off-centre, pushed down and right. The art sits flush in the
 * card's bottom-right corner, so those two edges have no card behind them to seam
 * against and are left solid; only the two inner edges need to dissolve. A symmetric
 * fade would lift the figure off the corner and leave it floating.
 *
 * `MaskedView` ships inside Expo Go (expo-router already depends on it), so this costs
 * no new native module.
 */
function FadedAvatar({
  gender,
  width,
  height,
}: {
  gender: AvatarGender;
  width: number;
  height: number;
}) {
  return (
    <View style={styles.art} pointerEvents="none">
      <AvatarMask width={width} height={height} focus={MASK_BOTTOM_RIGHT}>
        <Image
          source={getAvatar(gender, 'happy')}
          style={{ width, height }}
          contentFit="contain"
          cachePolicy="memory"
          // No crossfade: a half-drawn frame would be baked into the exported image.
          transition={0}
        />
      </AvatarMask>
    </View>
  );
}

/**
 * Scattered flecks.
 *
 * Positions come from an index-driven hash rather than `Math.random`, so the card a user
 * previews is pixel-identical to the one captured a second later.
 */
function Confetti({ width, height }: { width: number; height: number }) {
  const pieces = Array.from({ length: 22 }, (_, i) => {
    const t = (i * 2654435761) % 1000; // Knuth's multiplicative hash, kept in range.
    return {
      key: i,
      x: width * 0.44 + ((t % 97) / 97) * width * 0.54,
      y: height * 0.05 + ((t % 89) / 89) * height * 0.34,
      r: 1.5 + ((t % 7) / 7) * 2.5,
      color: i % 3 === 0 ? Palette.gold : Palette.brand,
      opacity: 0.2 + ((t % 11) / 11) * 0.45,
    };
  });

  return (
    <Svg width={width} height={height} style={styles.wash}>
      {pieces.map((p) =>
        p.key % 4 === 0 ? (
          <Path
            key={p.key}
            d={`M${p.x} ${p.y}l${p.r * 2} ${p.r}l-${p.r * 2} ${p.r}z`}
            fill={p.color}
            opacity={p.opacity}
          />
        ) : (
          <Circle key={p.key} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={p.opacity} />
        ),
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderColor: withAlpha(Palette.brand, 0.16),
  },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // Anchored to the corner so the figure stands in the frame rather than floating in it.
  art: { position: 'absolute', right: 0, bottom: 0 },
  // Flex, not absolute: the three blocks space themselves, so a longer streak label or a
  // larger system font pushes the layout instead of overlapping it.
  content: { flex: 1, justifyContent: 'space-between' },
  wordmark: { letterSpacing: -0.5 },
  middle: { flex: 1, justifyContent: 'center' },
  // Playfair is the card's whole visual identity here: the sentence is the artwork rather
  // than a caption beside it. The family is stated explicitly because Playfair registers
  // one family per weight, so `fontWeight` alone would render regular.
  headline: {
    fontFamily: FontFamily.displayBold,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  rule: {
    width: 64,
    height: 1,
    backgroundColor: withAlpha(Palette.brand, 0.35),
    marginBlock: Spacing.three,
  },
  body: { lineHeight: 20, maxWidth: '72%' },
});
