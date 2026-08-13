import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** Long enough to feel deliberate, short enough not to be a chore. */
const DEFAULT_HOLD_MS = 1000;
/** Spacing of the tick that plays while charging. */
const TICK_MS = 150;

/**
 * A press-and-hold that only commits at full charge.
 *
 * The charge lives here rather than inside the button so a caller can hand the same
 * value to other things — the streak ring fills in the same motion as the button, which
 * is the entire point of holding rather than tapping.
 *
 * Ownership matters. A shared value written inside the component it was passed *to* is a
 * prop mutation, and listing it in a `useCallback` dependency array is a hook-argument
 * mutation; the React Compiler rejects both. Created here and returned read-only, with
 * no manual memoisation for it to be listed in, it is simply a local — and the compiler
 * gives these functions stable identities on its own.
 */
export function useHoldCharge(onComplete: () => void, holdMs = DEFAULT_HOLD_MS) {
  const charge = useSharedValue(0);
  const [holding, setHolding] = useState(false);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  // A held button that survives unmount would keep buzzing a screen that is gone.
  useEffect(
    () => () => {
      if (ticker.current) clearInterval(ticker.current);
    },
    [],
  );

  function stopTicking() {
    if (ticker.current) {
      clearInterval(ticker.current);
      ticker.current = null;
    }
  }

  function finish() {
    stopTicking();
    setHolding(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onComplete();
  }

  function start() {
    setHolding(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    stopTicking();
    ticker.current = setInterval(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, TICK_MS);

    // Scaled by what is left to charge, so re-grabbing a partly-drained bar does not
    // restart the full duration.
    charge.value = withTiming(
      1,
      { duration: holdMs * (1 - charge.value), easing: Easing.linear },
      (completed) => {
        // False when cancelled by an early release — exactly the case that must not
        // commit anything.
        if (completed) runOnJS(finish)();
      },
    );
  }

  function release() {
    stopTicking();
    setHolding(false);
    cancelAnimation(charge);
    charge.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) });
  }

  /** Snaps back to empty with no animation — for after a commit resolves, or fails. */
  function reset() {
    stopTicking();
    setHolding(false);
    cancelAnimation(charge);
    charge.value = 0;
  }

  return { charge, holding, start, release, reset };
}
