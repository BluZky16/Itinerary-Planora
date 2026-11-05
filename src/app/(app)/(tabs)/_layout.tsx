import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';

const TABS = [
  ['index', 'Dashboard', 'home-outline'],
  ['itineraries', 'My Itineraries', 'list-outline'],
  ['explore', 'Explore', 'compass-outline'],
  ['travel-map', 'Travel Map', 'earth-outline'],
  ['budget', 'Budget', 'wallet-outline'],
] as const;

// Bottom tabs on phones; on wide screens the same tabs become a sidebar on the left.
export default function TabsLayout() {
  const wide = useWindowDimensions().width >= 768;
  return (
    <Tabs
      screenOptions={{
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarVariant: wide ? 'material' : 'uikit',
        tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
      }}>
      {TABS.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          // color is the theme's tint, always a string here; the navigation type also allows numbers
          options={{ title, tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={color as string} size={size} /> }}
        />
      ))}
    </Tabs>
  );
}
