import { Stack } from 'expo-router';

import { color } from '@/theme/tokens';

/**
 * The Invest tab is a stack, not a single screen.
 *
 * The Time Machine and its success screen push over the tab bar rather than living
 * beside it: they are one continuous decision — look at your future, change it, confirm
 * it — and letting the user tab away mid-commit would leave a half-made choice behind.
 */
export default function InvestLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.screen },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="time-machine" />
      {/* No swipe back off the success screen: the change is already committed, and
          sliding back to the sheet that made it would invite a second submission. */}
      <Stack.Screen name="success" options={{ gestureEnabled: false, animation: 'fade' }} />
    </Stack>
  );
}
