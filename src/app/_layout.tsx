import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Celebration } from '@/components/streak/celebration';
import { FontAssets, Palette } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Rejects if the splash module was already torn down (common across fast refresh).
  // Nothing to recover, and throwing here would take the whole app down on reload.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FontAssets);

  // If a font fails to load we still boot, falling back to system faces. Blocking the
  // app forever on a font is a far worse failure than slightly wrong typography.
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: Palette.bgPage }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Palette.bgPage }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Palette.bgPage },
            animation: 'fade',
          }}
        />
        {/* Above the navigator, so a milestone celebrates wherever it was earned —
            Today, Invest or the streak screen — rather than only on one of them. */}
        <Celebration />
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
