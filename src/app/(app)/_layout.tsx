import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/ui/tab-bar';
import { Palette } from '@/theme';

/**
 * The product, once onboarding is done.
 *
 * Four tabs that mirror BlinkMoney's own loop — Save → Grow → Borrow → Still Grow.
 * Today is where the daily decision lives, Invest is the decision itself, Borrow is the
 * pressure valve that keeps compounding intact, and Future is the reason for all three.
 *
 * Declared as explicit children rather than left to file order, because the order of
 * these four is the story the navigation tells.
 */
export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Palette.bgPage },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="invest" options={{ title: 'Invest' }} />
      <Tabs.Screen name="borrow" options={{ title: 'Borrow' }} />
      <Tabs.Screen name="future" options={{ title: 'Future' }} />
    </Tabs>
  );
}
