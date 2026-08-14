import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing, contentWidth, withAlpha } from '@/theme';

/** How long each slide holds before advancing on its own. */
const DWELL_MS = 5000;

type Slide = {
  key: string;
  /** Rendered in Playfair. The italic green fragment is the second half. */
  title: string;
  accent: string;
  body: string;
  /** Green fragment inside the body, if any. */
  bodyAccent?: string;
  caption?: string;
  legal?: string;
};

/**
 * BlinkMoney's own hero copy, in their own voice.
 *
 * Verbatim from blinkmoney.in rather than paraphrased, because the value proposition is
 * the one thing in this app that is not ours to rewrite.
 */
const SLIDES: Slide[] = [
  {
    key: 'fd',
    title: 'Better than your',
    accent: 'Dad’s FD',
    body: '15% p.a.* returns in a basket of ',
    bodyAccent: 'Stock + FD + Gold.',
    caption: 'Expert-managed. No lock-in. Start with just ₹21/day.',
    legal: '*T&C apply',
  },
  {
    key: 'grow',
    title: '✦ Grow ✦ Borrow ✦',
    accent: 'Still Grow',
    body: 'Your ',
    bodyAccent: 'investments keep compounding',
    caption: '…even when you borrow against them.',
    legal: '*T&C apply',
  },
  {
    key: 'start',
    title: 'Start with just',
    accent: '₹21 a day',
    body: 'India’s first ',
    bodyAccent: 'Liquid Wealth Account.',
    caption: 'No income proof. No credit score.',
  },
  {
    key: 'borrow',
    title: 'Cash without',
    accent: 'selling',
    body: 'Borrow at ',
    bodyAccent: '9.99% p.a.*',
    caption: 'Against your portfolio, in ten minutes.',
    legal: '*T&C apply',
  },
  {
    key: 'future',
    title: 'Your future has',
    accent: 'a face',
    body: 'Meet the version of you your ',
    bodyAccent: 'daily habit',
    caption: '…is quietly building, one day at a time.',
  },
];

/**
 * The home hero.
 *
 * A paged carousel rather than a static banner, because BlinkMoney's own site leads with
 * one and the product has more than one thing worth saying first. It advances on its own
 * so a user who never swipes still sees the range — and stops advancing the moment they
 * touch it, because a card that moves under your thumb while you are reading it is worse
 * than one that never moves at all.
 */
function HeroCarouselBase() {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const scroller = useRef<ScrollView>(null);

  const [index, setIndex] = useState(0);
  // Held only for the duration of a touch. Advancing a card out from under a thumb
  // mid-sentence is the one thing an auto-carousel must never do.
  const [paused, setPaused] = useState(false);

  // Matches the Screen shell's content box exactly, so a slide fills the scroller rather
  // than leaving a slice of its neighbour permanently in view.
  const slideWidth = contentWidth(width);

  useEffect(() => {
    // Keyed on `index`, so the clock restarts after *any* change — a swipe or a dot tap
    // buys a fresh five seconds rather than landing on a slide already about to move.
    // Reduced motion opts out entirely: self-advancing content is exactly what that
    // setting exists to stop.
    if (paused || reduced) return;
    const timer = setTimeout(() => {
      const next = (index + 1) % SLIDES.length;
      scroller.current?.scrollTo({ x: next * slideWidth, animated: true });
      setIndex(next);
    }, DWELL_MS);
    return () => clearTimeout(timer);
  }, [index, paused, reduced, slideWidth]);

  const go = (next: number) => {
    const clamped = (next + SLIDES.length) % SLIDES.length;
    setIndex(clamped);
    scroller.current?.scrollTo({ x: clamped * slideWidth, animated: !reduced });
  };

  /**
   * Settles the index after a manual swipe.
   *
   * Wired to both momentum-end and drag-end: a slow release produces no momentum, so
   * relying on momentum alone would leave the dots pointing at the previous card.
   */
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    if (next !== index) setIndex(next);
    setPaused(false);
  };

  return (
    <View>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={slideWidth}
        snapToAlignment="start"
        disableIntervalMomentum
        onScrollBeginDrag={() => setPaused(true)}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
        accessibilityRole="list"
        accessibilityLabel="Highlights">
        {SLIDES.map((slide) => (
          <HeroSlide key={slide.key} slide={slide} width={slideWidth} />
        ))}
      </ScrollView>

      <View style={styles.dots} accessibilityRole="tablist">
        {SLIDES.map((slide, i) => (
          <Dot key={slide.key} active={i === index} onPress={() => go(i)} label={slide.accent} />
        ))}
      </View>
    </View>
  );
}

function HeroSlide({ slide, width }: { slide: Slide; width: number }) {
  return (
    <View style={{ width }} accessible accessibilityRole="text">
      <View style={styles.card}>
        {/* The site's signature green horizon, sitting under the type. */}
        <LinearGradient
          colors={[
            withAlpha(Palette.brandSecondary, 0.28),
            withAlpha(Palette.brandDecorative, 0.06),
            'rgba(0,0,0,0)',
          ]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.15, y: 1 }}
          end={{ x: 0.9, y: 0 }}
          style={styles.wash}
        />

        <ThemedText type="display" style={styles.title}>
          {slide.title}{' '}
          <ThemedText type="display" themeColor="brand" style={styles.accent}>
            {slide.accent}
          </ThemedText>
        </ThemedText>

        <View style={styles.rule} />

        <ThemedText type="body" themeColor="textSecondary" style={styles.body}>
          {slide.body}
          {slide.bodyAccent ? (
            <ThemedText type="bodyBold" themeColor="brand">
              {slide.bodyAccent}
            </ThemedText>
          ) : null}
        </ThemedText>

        {slide.caption ? (
          <ThemedText type="caption" themeColor="textSecondary" style={styles.caption}>
            {slide.caption}
          </ThemedText>
        ) : null}

        {slide.legal ? (
          <ThemedText type="caption" themeColor="textTertiary" style={styles.legal}>
            {slide.legal}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const Dot = memo(function Dot({
  active,
  onPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  const style = useAnimatedStyle(() => ({
    // The active dot stretches into a pill rather than just brightening, so position is
    // legible at a glance instead of requiring a colour comparison.
    width: withTiming(active ? 18 : 6, { duration: 240 }),
    backgroundColor: withTiming(active ? Palette.brand : Palette.bgElevated, { duration: 240 }),
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}>
      <Animated.View style={[styles.dot, style]} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    minHeight: 214,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
    padding: Spacing.four,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  title: { fontSize: 30, lineHeight: 38 },
  // Playfair's italic is what carries the site's voice in the accented half.
  accent: { fontStyle: 'italic' },
  rule: {
    width: 96,
    height: 1,
    backgroundColor: Palette.border,
    marginBlock: Spacing.three,
  },
  body: { lineHeight: 23 },
  caption: { marginBlockStart: Spacing.one },
  legal: { marginBlockStart: Spacing.three },

  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBlockStart: Spacing.three,
  },
  dot: { height: 6, borderRadius: Radius.pill },
});

export const HeroCarousel = memo(HeroCarouselBase);
