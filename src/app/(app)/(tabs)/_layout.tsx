import { Tabs } from 'expo-router';

// shortcut: text-only tab labels, no icons; add icons and the wide-web sidebar in phase 7.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#570df8', tabBarIcon: () => null }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="itineraries" options={{ title: 'My Itineraries' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="travel-map" options={{ title: 'Travel Map' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
    </Tabs>
  );
}
