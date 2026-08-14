import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ChevronIcon } from '@/components/brand/icons';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/back-button';
import { Screen } from '@/components/ui/screen';
import { FAQS, type FaqEntry } from '@/domain/faq';
import { Layout, Palette, Radius, Spacing, withAlpha } from '@/theme';

/**
 * FAQ.
 *
 * An accordion rather than five open blocks: the value of this screen is being able to
 * scan the questions and open only the one you came for. One row open at a time, so the
 * list never becomes the wall of text it exists to avoid.
 */
export default function FaqScreen() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Screen scroll>
      <Stack.Screen options={{ animation: 'slide_from_right' }} />

      <View style={styles.header}>
        <BackButton fallback="/(app)/home" />
        <ThemedText type="title" numberOfLines={1} style={styles.title}>
          FAQ
        </ThemedText>
        <View style={styles.spacer} />
      </View>

      <Animated.View entering={FadeIn.duration(320)}>
        <ThemedText type="body" themeColor="textSecondary" style={styles.intro}>
          The five things people ask first.
        </ThemedText>
      </Animated.View>

      <View style={styles.list}>
        {FAQS.map((entry, index) => (
          <Animated.View key={entry.id} entering={FadeInDown.delay(60 + index * 50).duration(300)}>
            <FaqRow
              entry={entry}
              open={openId === entry.id}
              onToggle={() => setOpenId((current) => (current === entry.id ? null : entry.id))}
            />
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

function FaqRow({
  entry,
  open,
  onToggle,
}: {
  entry: FaqEntry;
  open: boolean;
  onToggle: () => void;
}) {
  const rotation = useSharedValue(0);

  // Must be an effect, not a render-body assignment: writing to a shared value during
  // render mutates state React may discard, and Reanimated warns about exactly this.
  useEffect(() => {
    rotation.value = withTiming(open ? 1 : 0, { duration: 200 });
  }, [open, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 90}deg` }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={entry.question}
      onPress={onToggle}
      style={[styles.row, open && styles.rowOpen]}>
      <View style={styles.question}>
        <ThemedText type="bodyBold" style={styles.questionText}>
          {entry.question}
        </ThemedText>
        <Animated.View style={chevronStyle}>
          <ChevronIcon size={18} color={open ? Palette.brand : Palette.textTertiary} />
        </Animated.View>
      </View>

      {open ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
          <ThemedText type="body" themeColor="textSecondary" style={styles.answer}>
            {entry.answer}
          </ThemedText>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBlockStart: Spacing.four,
  },
  title: { flex: 1, textAlign: 'center' },
  // Balances the back button so the title sits optically centred.
  spacer: { width: Layout.minTouchTarget },
  intro: { marginBlockStart: Spacing.four },
  list: { marginBlock: Spacing.five, gap: Spacing.three },
  row: {
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
  },
  rowOpen: { borderColor: withAlpha(Palette.brand, 0.3) },
  question: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  questionText: { flex: 1 },
  answer: {
    marginBlockStart: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    lineHeight: 23,
  },
});
