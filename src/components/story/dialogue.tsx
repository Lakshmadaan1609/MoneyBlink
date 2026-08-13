import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/theme';

const CHAR_MS = 26;
/**
 * Holds the bubble at roughly three lines regardless of what is in it. Without this the
 * box grows and shrinks from one line of dialogue to the next, which resizes the
 * character's slot underneath it and makes them twitch on every beat.
 */
const MIN_HEIGHT = 140;

type DialogueProps = {
  text: string;
  /** Set true to show the whole line at once — a tap while it is still typing. */
  skip?: boolean;
  onDone?: () => void;
};

/**
 * Typed-out dialogue.
 *
 * Revealing a character at a time gives the words a speaking pace, which is what makes
 * this read as a conversation rather than a wall of onboarding copy. A tap skips
 * straight to the full line, because forcing someone to watch an animation they have
 * already read is the fastest way to make a story feel like an obstacle.
 *
 * What is shown is *derived* from a tick count rather than stored, so a skip cannot be
 * overwritten by a timer that is still running — it simply stops mattering. Callers pass
 * a `key` per line; remounting is what resets the reveal.
 */
function DialogueBase({ text, skip, onDone }: DialogueProps) {
  const [ticks, setTicks] = useState(0);

  const done = Boolean(skip) || ticks >= text.length;
  const shown = done ? text : text.slice(0, ticks);

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setTicks((t) => t + 1), CHAR_MS);
    return () => clearInterval(timer);
  }, [done]);

  useEffect(() => {
    if (done) onDone?.();
    // `onDone` deliberately omitted: callers pass inline closures, and including it
    // would fire the callback on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <Animated.View entering={FadeIn.duration(240)}>
      <View style={styles.bubble}>
        <ThemedText type="subtitle" style={styles.text}>
          {shown}
          {/* Reserves the full line's height from the first frame so the bubble does
              not grow line by line and shove the layout around. */}
          <ThemedText type="subtitle" style={styles.ghost}>
            {text.slice(shown.length)}
          </ThemedText>
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    minHeight: MIN_HEIGHT,
    justifyContent: 'center',
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  text: { lineHeight: 30 },
  ghost: { opacity: 0 },
});

export const Dialogue = memo(DialogueBase);
