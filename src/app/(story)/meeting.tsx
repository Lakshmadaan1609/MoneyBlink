import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dialogue } from '@/components/story/dialogue';
import { StoryStage } from '@/components/story/story-stage';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import { CHAPTER_ONE, renderLine } from '@/domain/story';
import type { Purpose } from '@/domain/types';
import { firstName } from '@/domain/validation';
import { actions, select, useFuture } from '@/store/future-store';
import { Layout, Palette, Radius, Spacing } from '@/theme';

type Phase = 'dialogue' | 'question' | 'answered';

/**
 * Chapter 1 — The meeting.
 *
 * The user's future self introduces itself, then asks the one question the rest of the
 * product hangs on: who is this for? The screen is a vertical stack — words on top, the
 * character in the middle, choices at the bottom — so the character is never buried
 * behind the panel they are asking you to answer.
 *
 * This is also the answer to the brief's "no static screens" rule: nothing advances
 * without a tap, and the choice mutates state every later screen reads.
 */
export default function MeetingScreen() {
  const profile = useFuture(select.profile);
  const mutating = useFuture(select.mutating);
  const apiError = useFuture(select.error);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [phase, setPhase] = useState<Phase>('dialogue');
  const [lineIndex, setLineIndex] = useState(0);
  const [typed, setTyped] = useState(false);
  const [choice, setChoice] = useState<Purpose | null>(null);

  const chapter = CHAPTER_ONE;
  const name = profile?.name ? firstName(profile.name) : 'friend';
  const gender = profile?.gender ?? 'male';

  const line = chapter.lines[lineIndex];
  const text = useMemo(() => renderLine(line?.text ?? '', name), [line, name]);

  // Expression follows the beat: the scripted face while talking, the "warm" face once
  // a purpose is chosen.
  const expression =
    phase === 'answered' ? chapter.responseExpression : (line?.expression ?? 'happy');

  /** Tap anywhere: finish typing the current line, or move to the next beat. */
  const advance = useCallback(() => {
    if (phase !== 'dialogue') return;
    if (!typed) {
      setTyped(true);
      return;
    }
    if (lineIndex < chapter.lines.length - 1) {
      setLineIndex((i) => i + 1);
      setTyped(false);
    } else {
      setPhase('question');
    }
  }, [chapter.lines.length, lineIndex, phase, typed]);

  /**
   * Back rewinds the chapter one beat at a time rather than dumping the user out of it.
   * Only at the very first line does it hand control to the navigator — leaving a story
   * from its middle loses the thread, and re-reading a line is cheap.
   */
  const atStart = phase === 'dialogue' && lineIndex === 0;

  const goBack = useCallback(() => {
    if (phase === 'answered') {
      setChoice(null);
      setPhase('question');
      return;
    }
    if (phase === 'question') {
      setPhase('dialogue');
      setLineIndex(chapter.lines.length - 1);
      // Already read, so restore it whole rather than re-typing it.
      setTyped(true);
      return;
    }
    if (lineIndex > 0) {
      setLineIndex((i) => i - 1);
      setTyped(true);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(onboarding)/details');
  }, [chapter.lines.length, lineIndex, phase]);

  // The hardware/gesture back must do exactly what the on-screen control does, or the
  // two disagree about where "back" is.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (atStart) return false;
        goBack();
        return true;
      });
      return () => subscription.remove();
    }, [atStart, goBack]),
  );

  const pick = useCallback((purpose: Purpose) => {
    setChoice(purpose);
    setPhase('answered');
  }, []);

  const finish = useCallback(async () => {
    if (!choice) return;
    const ok = await actions.savePurpose(choice);
    if (!ok) return;
    // Onboarding is done, so tear the flow off the stack: back from home should leave
    // the app, not walk the user through sign-up a second time.
    if (router.canDismiss()) router.dismissAll();
    router.replace('/(app)/home');
  }, [choice]);

  return (
    <View style={styles.root}>
      {/* Everything above the choices is one tap target, so "tap to continue" works
          wherever the thumb happens to land. */}
      <Pressable
        style={styles.tapLayer}
        onPress={advance}
        disabled={phase !== 'dialogue'}
        accessibilityRole={phase === 'dialogue' ? 'button' : 'none'}
        accessibilityLabel={phase === 'dialogue' ? 'Tap to continue' : undefined}>
        <View style={[styles.top, { paddingTop: insets.top + Spacing.three }]}>
          <View style={styles.measure}>
            <View style={styles.titleRow}>
              <BackButton onPress={goBack} fallback="/(onboarding)/gender" />
              <ThemedText type="overline" themeColor="brand">
                Chapter {chapter.number} · {chapter.title}
              </ThemedText>
            </View>

            {phase === 'dialogue' ? (
              <>
                <View style={styles.bubbleWrap}>
                  {/* Keyed per line: the remount is what restarts the reveal. */}
                  <Dialogue
                    key={lineIndex}
                    text={text}
                    skip={typed}
                    onDone={() => setTyped(true)}
                  />
                </View>

                <View style={styles.beats}>
                  {chapter.lines.map((_, i) => (
                    <View key={i} style={[styles.beat, i <= lineIndex && styles.beatOn]} />
                  ))}
                </View>

                <Animated.View entering={FadeIn.delay(600)}>
                  <ThemedText type="caption" themeColor="textTertiary" style={styles.hint}>
                    {typed ? 'Tap to continue' : 'Tap to skip'}
                  </ThemedText>
                </Animated.View>
              </>
            ) : (
              <Animated.View entering={FadeInDown.duration(420)} exiting={FadeOut}>
                <ThemedText type="display" style={styles.question}>
                  {phase === 'answered' && choice
                    ? chapter.responses[choice]
                    : chapter.question}
                </ThemedText>
              </Animated.View>
            )}
          </View>
        </View>

        {/* The character takes whatever height is left. When the choices open below,
            this slot shrinks and the character steps back to stay fully in view. */}
        <View style={styles.stageSlot}>
          <View style={styles.stageMeasure}>
            <StoryStage
              gender={gender}
              expression={expression}
              warmth={phase === 'answered' ? 1 : 0}
            />
          </View>
        </View>
      </Pressable>

      {phase !== 'dialogue' ? (
        <Animated.View
          entering={FadeInDown.duration(420)}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}>
          {phase === 'question' ? (
            <ScrollView
              // Capped so the choices can never squeeze the character out of the frame,
              // and scroll instead on a short screen.
              style={[styles.options, { maxHeight: Math.min(360, height * 0.4) }]}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}>
              {chapter.options.map((option, i) => (
                <Animated.View key={option.key} entering={FadeInDown.delay(80 * i).duration(320)}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: choice === option.key }}
                    onPress={() => pick(option.key)}
                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
                    <ThemedText type="bodyBold">{option.label}</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {option.caption}
                    </ThemedText>
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.confirm}>
              {apiError ? (
                <ErrorState inline error={apiError} onDismiss={actions.clearError} />
              ) : null}
              <Button
                label="Let's begin"
                onPress={finish}
                loading={mutating}
                haptic="success"
              />
              <Pressable onPress={() => setPhase('question')} hitSlop={8}>
                <ThemedText type="caption" themeColor="textTertiary" style={styles.change}>
                  Choose something else
                </ThemedText>
              </Pressable>
            </View>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.bgPage },
  tapLayer: { flex: 1 },
  top: { paddingHorizontal: Layout.screenPadding },
  measure: { width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bubbleWrap: { marginBlockStart: Spacing.four },
  beats: { flexDirection: 'row', gap: Spacing.one, marginBlockStart: Spacing.three },
  beat: {
    width: 20,
    height: 3,
    borderRadius: Radius.pill,
    backgroundColor: Palette.bgElevated,
  },
  beatOn: { backgroundColor: Palette.brand },
  hint: { marginBlockStart: Spacing.three },
  question: { marginBlockStart: Spacing.four },

  stageSlot: {
    flex: 1,
    // Lets the character stand *into* the panel below rather than balancing on top of
    // it — the classic overlap that keeps them grounded instead of floating.
    marginBlockEnd: -Spacing.four,
  },
  stageMeasure: { flex: 1, width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center' },

  sheet: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.four,
    backgroundColor: Palette.bgPage,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  options: { flexShrink: 1 },
  optionsContent: { gap: Spacing.two, paddingBottom: Spacing.two },
  option: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgCard,
    gap: 2,
  },
  optionPressed: { borderColor: Palette.brand, backgroundColor: Palette.bgChip },
  confirm: { gap: Spacing.three },
  change: { textAlign: 'center' },
});
