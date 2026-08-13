import { Stack } from 'expo-router';

import { Palette } from '@/theme';

/**
 * Story stack.
 *
 * Fades between chapters rather than sliding — a slide reads as "next form page",
 * a fade reads as a scene change.
 */
export default function StoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        // Chapters must be answered in order; swiping back mid-scene would desync the
        // narration from the state already persisted.
        gestureEnabled: false,
        contentStyle: { backgroundColor: Palette.bgPage },
      }}
    />
  );
}
