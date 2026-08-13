import { Stack } from 'expo-router';

import { Palette } from '@/theme';

/**
 * Sign-up stack.
 *
 * Slides forward so the flow reads as linear progress. The swipe-back gesture stays on
 * — a user who mistypes their number must be able to go back and fix it — but each
 * screen re-reads persisted state on mount, so stepping backwards can never desync the
 * UI from what the backend has actually accepted.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Palette.bgPage },
      }}
    />
  );
}
